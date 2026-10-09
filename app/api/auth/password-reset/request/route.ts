import {NextResponse} from 'next/server';
import {store} from '@/backend/repository';

export async function POST(req:Request){
 try{
  const body=await req.json(),phone=typeof body.phone==='string'?body.phone.trim():'';
  if(phone.length>20||phone.replace(/\D/g,'').length<8)return NextResponse.json({error:'Enter your registered mobile number.'},{status:400});
  await store.requestPasswordReset(phone);
  return NextResponse.json({ok:true,message:'If a farmer or company account uses that number, an admin will review the reset request.'});
 }catch(error){console.error('[password-reset/request] Request failed:',error);return NextResponse.json({error:'Could not submit the reset request.'},{status:500});}
}
