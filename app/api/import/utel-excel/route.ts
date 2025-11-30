import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';
import { getManagerNameFromExtension } from '@/lib/extensionMapping';

const BATCH_SIZE = 100;

function parseDuration(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':');
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map(Number);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart || !timePart) return null;
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
  const utcDate = new Date(localDate.getTime() - (5 * 60 * 60 * 1000));
  return utcDate;
}

export async function POST(request: NextRequest) {
  try {
    const filePath = './attached_assets/calls-table (2)_1764528299599.xlsx';
    
    console.log('[Import/UTel] Attempting to read file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('[Import/UTel] File not found');
      return NextResponse.json({ error: 'Excel file not found', path: filePath }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    const dataRows = rawData.slice(1);

    console.log(`[Import/UTel] Processing ${dataRows.length} calls from Excel`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      const batch = dataRows.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        try {
          const dateStr = row[1];
          const date = parseDate(dateStr);
          if (!date) {
            errors++;
            continue;
          }

          const rowId = row[0];
          const caller = String(row[2] || '');
          const extension = String(row[3] || '');
          const dst = String(row[4] || '');
          const durationStr = String(row[6] || '00:00:00');
          const directionStr = String(row[7] || '');
          const statusStr = String(row[8] || '');

          const direction = directionStr === 'Incoming' ? 'in' : 'out';
          const duration = parseDuration(durationStr);
          
          let phone = direction === 'in' ? caller : dst;
          phone = phone.replace(/^998/, '');
          
          const manager = getManagerNameFromExtension(extension);
          
          const callId = `utel-excel-${rowId}-${date.getTime()}`;

          await prisma.utelCall.upsert({
            where: { callId },
            update: {
              direction,
              date,
              duration,
              phone,
              extension,
              manager,
              source: 'excel-import'
            },
            create: {
              callId,
              direction,
              date,
              duration,
              phone,
              extension,
              manager,
              source: 'excel-import'
            }
          });

          imported++;
        } catch (err) {
          if ((err as any)?.code === 'P2002') {
            skipped++;
          } else {
            errors++;
            console.error('[Import/UTel] Error importing call:', err);
          }
        }
      }

      console.log(`[Import/UTel] Progress: ${Math.min(i + BATCH_SIZE, dataRows.length)}/${dataRows.length}`);
    }

    const totalInDb = await prisma.utelCall.count();

    return NextResponse.json({
      success: true,
      message: 'UTel Excel import completed',
      stats: {
        totalInExcel: dataRows.length,
        imported,
        skipped,
        errors,
        totalInDatabase: totalInDb
      }
    });
  } catch (error) {
    console.error('[Import/UTel] Import failed:', error);
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to import UTel Excel data',
    endpoint: '/api/import/utel-excel'
  });
}
