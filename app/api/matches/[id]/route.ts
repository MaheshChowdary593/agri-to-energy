import {NextResponse} from 'next/server';
import {store} from '@/backend/repository';
import {canTransition} from '@/backend/matching';
import {requestUser} from '@/backend/session';

export async function PATCH(req:Request,{params}:{params:{id:string}}){
 try{
  const user=await requestUser(req);
  if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
  const body=await req.json();
  const match=(await store.matches()).find(item=>item.id===params.id);
  if(!match)return NextResponse.json({error:'Match not found'},{status:404});
  const [listings,demands]=await Promise.all([store.listings(),store.demands()]);
  const listing=listings.find(item=>item.id===match.listingId);
  const demand=demands.find(item=>item.id===match.demandId);
  const farmer=user.role==='farmer'&&listing?.farmerId===user.id;
  const buyer=user.role==='buyer'&&demand?.buyerId===user.id;
  const admin=user.role==='admin';
  if(!farmer&&!buyer&&!admin)return NextResponse.json({error:'You cannot update this match.'},{status:403});

  let next=match.status;
  let pickupDate=match.pickupDate;
  if(body.pickupDate&&match.status==='matched'&&(farmer||buyer)){
   if(typeof body.pickupDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.pickupDate))return NextResponse.json({error:'Enter a valid pickup date.'},{status:400});
   next='pickup_scheduled';pickupDate=body.pickupDate;
  }else if(body.status){
   if(!admin||!['collected','paid'].includes(body.status))return NextResponse.json({error:'Only admins can mark a pickup collected or paid.'},{status:403});
   if(!canTransition(match.status,body.status))return NextResponse.json({error:'Invalid status transition'},{status:400});
   next=body.status;
  }else return NextResponse.json({error:'Provide a pickup date or valid status.'},{status:400});

  const updated=await store.updateMatch(match.id,{status:next,pickupDate,statusHistory:[...(match.statusHistory??[]),{status:next,at:new Date().toISOString(),by:user.id}]});
  await store.updateListing(match.listingId,{status:next});
  return NextResponse.json(updated);
 }catch{return NextResponse.json({error:'Invalid request'},{status:400});}
}
