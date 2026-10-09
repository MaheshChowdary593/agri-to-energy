import {NextRequest,NextResponse} from 'next/server';
import {store} from '@/backend/repository';

export async function GET(req:NextRequest){
 const token=req.cookies.get('khetloop_session')?.value;
 const user=token?await store.session(token):null;
 if(user?.role!=='admin')return NextResponse.json({error:'Admin sign-in required.'},{status:403});
 return NextResponse.json(await store.approvalHistory());
}
