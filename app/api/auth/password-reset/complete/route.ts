import {NextResponse} from 'next/server';
import {store} from '@/backend/repository';

export async function POST(req:Request){
 try{
  const body=await req.json(),phone=typeof body.phone==='string'?body.phone.trim():'',code=typeof body.code==='string'?body.code.trim().toUpperCase():'';
  if(typeof body.password!=='string'||body.password.length<8||phone.length>20||phone.replace(/\D/g,'').length<8||!/^[A-F0-9]{8}$/.test(code))return NextResponse.json({error:'Enter your mobile number, 8-character reset code, and a password of at least 8 characters.'},{status:400});
  if(!await store.completePasswordReset(phone,code,body.password))return NextResponse.json({error:'The reset code is invalid or expired. Ask an admin for a new code.'},{status:403});
  return NextResponse.json({ok:true});
 }catch(error){console.error('[password-reset/complete] Reset failed:',error);return NextResponse.json({error:'Could not reset this password.'},{status:500});}
}
