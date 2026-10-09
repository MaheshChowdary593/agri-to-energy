import {NextRequest,NextResponse} from 'next/server';import {store} from '@/backend/repository';
export async function GET(req:NextRequest){const token=req.cookies.get('khetloop_session')?.value;if(!token)return NextResponse.json({user:null});return NextResponse.json({user:await store.session(token)});}

