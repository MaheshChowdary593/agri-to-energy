import {NextResponse} from 'next/server';import {ai} from '@/backend/ai';
import {requestUser} from '@/backend/session';
export async function POST(req:Request){try{if((await requestUser(req))?.role!=='farmer')return NextResponse.json({error:'Farmer sign-in required.'},{status:403});const b=await req.json();if(!['paddy','wheat'].includes(b.crop)||!(Number(b.acres)>0)||Number(b.acres)>10000||typeof b.district!=='string'||!['en','hi','pa'].includes(b.language))return NextResponse.json({error:'Invalid advice request'},{status:400});const advice=await ai.advice(b.crop,Number(b.acres),b.district,new Date().getMonth()+1,b.language);return NextResponse.json(advice);}catch{return NextResponse.json({error:'Could not create advice'},{status:400});}}

