import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';
import { getManagerNameFromExtension } from '@/lib/extensionMapping';

const BATCH_SIZE = 100;

interface ExcelCallRow {
  'Тип звонка': string;
  'Кто': string;
  'Кому': string;
  'Внешний номер': string;
  'Дата': string;
  'Продолжительность': number;
  'Время разговора': number;
}

function parseCallDate(dateStr: string): Date | null {
  const match = dateStr.match(/\[(\d{2}):(\d{2}):(\d{2})\]\s*(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  
  const [, hours, minutes, seconds, year, month, day] = match;
  const localDate = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  );
  
  const utcDate = new Date(localDate.getTime() - (5 * 60 * 60 * 1000));
  return utcDate;
}

function determineDirection(callType: string): string {
  if (callType === 'Исходящий') return 'out';
  if (callType === 'Входящий' || callType === 'Пропущенный') return 'in';
  return 'out';
}

function extractExtension(who: string, whom: string, direction: string): string {
  if (direction === 'out') {
    const ext = who.match(/^\d{2,3}$/);
    if (ext) return who;
    const whomExt = whom.match(/^\d{2,3}$/);
    if (whomExt) return whom;
  } else {
    const ext = whom.match(/^\d{2,3}$/);
    if (ext) return whom;
  }
  
  if (who.length <= 4) return who;
  if (whom.length <= 4) return whom;
  
  return whom;
}

function extractPhone(who: string, whom: string, externalNumber: string, direction: string): string {
  if (direction === 'out') {
    if (whom.length > 6) return whom.replace(/^998/, '');
  } else {
    if (who.length > 6) return who.replace(/^998/, '');
    const phoneMatch = externalNumber.match(/(\d{9,})/);
    if (phoneMatch) return phoneMatch[1].replace(/^998/, '');
  }
  return who.replace(/^998/, '');
}

export async function POST(request: NextRequest) {
  try {
    const filePath = './attached_assets/onlinepbx calls 01-11-2025 - 30-11-2025_1764528302062.xlsx';
    
    console.log('[Import/OnlinePBX] Attempting to read file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('[Import/OnlinePBX] File not found');
      return NextResponse.json({ error: 'Excel file not found', path: filePath }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<ExcelCallRow>(sheet);

    const validCalls = data.filter(row => 
      row['Дата'] && 
      row['Дата'].includes('2025') &&
      !row['Дата'].includes('звонков') &&
      !row['Дата'].includes('минут')
    );

    console.log(`[Import/OnlinePBX] Processing ${validCalls.length} calls from Excel`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < validCalls.length; i += BATCH_SIZE) {
      const batch = validCalls.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        try {
          const date = parseCallDate(row['Дата']);
          if (!date) {
            errors++;
            continue;
          }

          const direction = determineDirection(row['Тип звонка']);
          const extension = extractExtension(row['Кто'], row['Кому'], direction);
          const phone = extractPhone(row['Кто'], row['Кому'], row['Внешний номер'], direction);
          const manager = getManagerNameFromExtension(extension);
          const duration = row['Время разговора'] || 0;

          const callId = `excel-${date.getTime()}-${extension}-${phone}`;

          await prisma.onlinePBXCall.upsert({
            where: { callId },
            update: {
              direction,
              date,
              duration,
              phone,
              user: manager,
              source: 'excel-import'
            },
            create: {
              callId,
              direction,
              date,
              duration,
              phone,
              user: manager,
              source: 'excel-import'
            }
          });

          imported++;
        } catch (err) {
          if ((err as any)?.code === 'P2002') {
            skipped++;
          } else {
            errors++;
            console.error('[Import/OnlinePBX] Error importing call:', err);
          }
        }
      }

      console.log(`[Import/OnlinePBX] Progress: ${Math.min(i + BATCH_SIZE, validCalls.length)}/${validCalls.length}`);
    }

    const totalInDb = await prisma.onlinePBXCall.count();

    return NextResponse.json({
      success: true,
      message: 'OnlinePBX Excel import completed',
      stats: {
        totalInExcel: validCalls.length,
        imported,
        skipped,
        errors,
        totalInDatabase: totalInDb
      }
    });
  } catch (error) {
    console.error('[Import/OnlinePBX] Import failed:', error);
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to import OnlinePBX Excel data',
    endpoint: '/api/import/onlinepbx-excel'
  });
}
