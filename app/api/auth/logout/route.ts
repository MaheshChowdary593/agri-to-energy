import {NextRequest,NextResponse} from 'next/server';import {store} from '@/backend/repository';
export async function POST(req:NextRequest){const token=req.cookies.get('khetloop_session')?.value;if(token)await store.logout(token);const res=NextResponse.json({ok:true});res.cookies.set('khetloop_session','',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});return res;}

