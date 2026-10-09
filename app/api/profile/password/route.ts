import {NextRequest,NextResponse} from 'next/server';
import {store} from '@/backend/repository';

export async function PATCH(req:NextRequest){
 const token=req.cookies.get('khetloop_session')?.value,user=token?await store.session(token):null;
 if(!user||!token)return NextResponse.json({error:'Sign in to change your password.'},{status:401});
 try{
  const body=await req.json();
  if(typeof body.currentPassword!=='string'||typeof body.newPassword!=='string'||body.newPassword.length<8||body.newPassword.length>128)return NextResponse.json({error:'Enter your current password and a new password with at least 8 characters.'},{status:400});
  const result=await store.changePassword(user.id,body.currentPassword,body.newPassword,token);
  if(result==='invalid')return NextResponse.json({error:'Your current password is incorrect.'},{status:403});
  if(result==='not_found')return NextResponse.json({error:'Account not found.'},{status:404});
  return NextResponse.json({ok:true});
 }catch(error){console.error('[profile/password] Password change failed:',error);return NextResponse.json({error:'Could not change your password.'},{status:500});}
}
