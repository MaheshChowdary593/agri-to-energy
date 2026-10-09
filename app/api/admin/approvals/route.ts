import {NextRequest,NextResponse} from 'next/server';import {store} from '@/backend/repository';
async function adminUser(req:NextRequest){const token=req.cookies.get('khetloop_session')?.value;const user=token?await store.session(token):null;return user?.role==='admin'?user:null;}
export async function GET(req:NextRequest){if(!await adminUser(req))return NextResponse.json({error:'Admin sign-in required.'},{status:403});return NextResponse.json(await store.pendingCompanies());}
export async function POST(req:NextRequest){const admin=await adminUser(req);if(!admin)return NextResponse.json({error:'Admin sign-in required.'},{status:403});try{const {userId}=await req.json();if(typeof userId!=='string'||!await store.approveCompany(userId,admin.id))return NextResponse.json({error:'Company account not found.'},{status:404});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}}

