import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {store} from '@/backend/repository';

export async function POST(req:Request){
 const expected=process.env.ADMIN_RECOVERY_KEY;
 if(!expected)return NextResponse.json({error:'Admin recovery is not configured.'},{status:503});
 try{
  const body=await req.json();
  if(typeof body.recoveryKey!=='string'||typeof body.phone!=='string'||typeof body.password!=='string'||body.password.length<8)return NextResponse.json({error:'Enter the recovery key, admin phone, and a password of at least 8 characters.'},{status:400});
  const supplied=Buffer.from(body.recoveryKey);
  if(supplied.length!==Buffer.byteLength(expected)||!timingSafeEqual(supplied,Buffer.from(expected)))return NextResponse.json({error:'Recovery details are incorrect.'},{status:403});
  if(!await store.resetAdminPassword(body.phone.trim(),body.password))return NextResponse.json({error:'Admin account not found.'},{status:404});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Invalid recovery request.'},{status:400});}
}
