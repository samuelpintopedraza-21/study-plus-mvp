import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geocodeBogotaAddress, estimateCommute } from '@/lib/geo';
import { getSchemaErrorMessage, isMissingTableError } from '@/lib/app-data';

export async function GET() {
  try {
    const profile = await db.studentProfile.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!profile) return NextResponse.json({ profile: null, commute: null });
    const commute = await estimateCommute(profile.homeLatitude, profile.homeLongitude, profile.transportMode as 'carro' | 'publico');
    return NextResponse.json({ profile, commute });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ profile: null, commute: null, error: getSchemaErrorMessage() }, { status: 500 });
    }
    return NextResponse.json({ error: 'No se pudo cargar el contexto de movilidad.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = String(body.homeAddress || '').trim();
    const transportMode = body.transportMode === 'carro' ? 'carro' : 'publico';

    if (!address) {
      return NextResponse.json({ error: 'Ingresa una dirección de referencia en Bogotá.' }, { status: 400 });
    }

    const geo = await geocodeBogotaAddress(address);
    await db.studentProfile.deleteMany();
    const profile = await db.studentProfile.create({
      data: {
        homeAddress: geo.address,
        homeLatitude: geo.latitude,
        homeLongitude: geo.longitude,
        transportMode,
      },
    });

    const commute = await estimateCommute(profile.homeLatitude, profile.homeLongitude, profile.transportMode as 'carro' | 'publico');
    return NextResponse.json({ profile, commute }, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la ubicación.' }, { status: 500 });
  }
}
