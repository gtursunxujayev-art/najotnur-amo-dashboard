import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ManagerStats {
  name: string;
  activeLeads: number;
  newLeads: number;
  sales: number;
  qualifiedLeads: number;
  nonQualifiedLeads: number;
  conversionToQualified: number;
  conversionToAllLeads: number;
  totalCalls: number;
  totalCallLength: number;
  dailyAvgCalls: number;
  dailyAvgCallLength: number;
  lostLeadReasons: { reason: string; count: number }[];
}

export async function GET(request: NextRequest) {
  try {
    // Mock data for Sotuvchilar page
    const mockManagers: ManagerStats[] = [
      {
        name: 'Matluba',
        activeLeads: 45,
        newLeads: 8,
        sales: 6,
        qualifiedLeads: 30,
        nonQualifiedLeads: 15,
        conversionToQualified: 66.7,
        conversionToAllLeads: 13.3,
        totalCalls: 109,
        totalCallLength: 10380,
        dailyAvgCalls: 54.5,
        dailyAvgCallLength: 5190,
        lostLeadReasons: [
          { reason: 'Narx ortiq', count: 5 },
          { reason: 'Vaqt yo\'q', count: 3 },
          { reason: 'Raqamni o\'zgartirdi', count: 2 },
        ],
      },
      {
        name: 'Mumtoza',
        activeLeads: 32,
        newLeads: 5,
        sales: 4,
        qualifiedLeads: 22,
        nonQualifiedLeads: 10,
        conversionToQualified: 68.8,
        conversionToAllLeads: 12.5,
        totalCalls: 54,
        totalCallLength: 3927,
        dailyAvgCalls: 27.0,
        dailyAvgCallLength: 1963.5,
        lostLeadReasons: [
          { reason: 'Narx ortiq', count: 4 },
          { reason: 'Boshqa kompaniya tanladi', count: 2 },
        ],
      },
      {
        name: 'Marg\'uba',
        activeLeads: 28,
        newLeads: 3,
        sales: 2,
        qualifiedLeads: 18,
        nonQualifiedLeads: 10,
        conversionToQualified: 64.3,
        conversionToAllLeads: 7.1,
        totalCalls: 20,
        totalCallLength: 1932,
        dailyAvgCalls: 10.0,
        dailyAvgCallLength: 966,
        lostLeadReasons: [
          { reason: 'Vaqt yo\'q', count: 5 },
          { reason: 'Narx ortiq', count: 3 },
        ],
      },
    ];

    return NextResponse.json({ managers: mockManagers });
  } catch (error) {
    console.error('[SotuvchilarAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manager statistics' },
      { status: 500 }
    );
  }
}
