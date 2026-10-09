import {NextResponse} from 'next/server';
import {store} from '@/backend/repository';
import {requestUser} from '@/backend/session';

export async function GET(req:Request,{params}:{params:{id:string}}){
 const viewer=await requestUser(req);
 if(!viewer)return NextResponse.json({error:'Sign in required.'},{status:401});
 const profile=(await store.users()).find(user=>user.id===params.id);
 if(!profile)return NextResponse.json({error:'Profile not found.'},{status:404});
 let matched=viewer.id===profile.id||viewer.role==='admin';
 if(!matched){
  const [matches,listings,demands]=await Promise.all([store.matches(),store.listings(),store.demands()]);
  matched=matches.some(match=>{
   const listing=listings.find(item=>item.id===match.listingId);
   const demand=demands.find(item=>item.id===match.demandId);
   return (listing?.farmerId===viewer.id&&demand?.buyerId===profile.id)||(listing?.farmerId===profile.id&&demand?.buyerId===viewer.id);
  });
 }
 if(!matched)return NextResponse.json({error:'Contact details are shared after a match.'},{status:403});
 return NextResponse.json({id:profile.id,name:profile.name,role:profile.role,phone:profile.phone,district:profile.district,state:profile.state,village:profile.village,language:profile.language,businessApproved:profile.role==='buyer'});
}
