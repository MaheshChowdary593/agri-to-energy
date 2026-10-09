import {NextRequest,NextResponse} from 'next/server';
import {store} from '@/backend/repository';

export async function PATCH(req:NextRequest){
 const token=req.cookies.get('khetloop_session')?.value;
 const user=token?await store.session(token):null;
 if(!user)return NextResponse.json({error:'Sign in to update your profile.'},{status:401});
 try{
  const body=await req.json();
  const name=typeof body.name==='string'?body.name.trim():'';
  const phone=typeof body.phone==='string'?body.phone.trim():'';
  const village=typeof body.village==='string'?body.village.trim():'';
  if(name.length<2||name.length>100)return NextResponse.json({error:'Enter a name between 2 and 100 characters.'},{status:400});
  if(phone.length>20||phone.replace(/\D/g,'').length<8||!/^[+\d][\d\s().-]*$/.test(phone))return NextResponse.json({error:'Enter a valid mobile number.'},{status:400});
  if(village.length<2||village.length>100)return NextResponse.json({error:'Enter a village between 2 and 100 characters.'},{status:400});
  const result=await store.updateProfile(user.id,{name,phone,village});
  if('error'in result)return NextResponse.json({error:result.error==='phone_taken'?'That mobile number is already linked to another account.':'Account not found.'},{status:result.error==='phone_taken'?409:404});
  return NextResponse.json({user:result.user});
 }catch(error){
  console.error('[profile] Profile update failed:',error);
  return NextResponse.json({error:'Could not update your profile.'},{status:500});
 }
}
