import {NextResponse} from 'next/server';import {store} from '@/backend/repository';
import {requestUser} from '@/backend/session';
export async function POST(req:Request){if((await requestUser(req))?.role!=='admin')return NextResponse.json({error:'Admin sign-in required.'},{status:403});if(process.env.NODE_ENV==='production'&&process.env.ENABLE_DEMO_RESET!=='true')return NextResponse.json({error:'Demo reset is disabled in production.'},{status:404});await store.reset();return NextResponse.json({ok:true});}

