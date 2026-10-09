import {NextRequest,NextResponse} from 'next/server';
import {store} from '@/backend/repository';

async function admin(req:NextRequest){const token=req.cookies.get('khetloop_session')?.value,user=token?await store.session(token):null;return user?.role==='admin'?user:null;}
export async function GET(req:NextRequest){if(!await admin(req))return NextResponse.json({error:'Admin sign-in required.'},{status:403});return NextResponse.json(await store.passwordResetRequests());}
export async function POST(req:NextRequest){const user=await admin(req);if(!user)return NextResponse.json({error:'Admin sign-in required.'},{status:403});try{const body=await req.json();if(typeof body.requestId!=='string')return NextResponse.json({error:'Reset request is required.'},{status:400});const code=await store.issuePasswordReset(body.requestId,user.id);return code?NextResponse.json({code,expiresInMinutes:15}):NextResponse.json({error:'This request is no longer active.'},{status:404});}catch(error){console.error('[admin/password-resets] Code issue failed:',error);return NextResponse.json({error:'Could not issue a reset code.'},{status:500});}}
