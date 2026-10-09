import type { User, Listing, Demand, Match } from '../shared/types';
import { LOCATIONS } from './locations';
const farmerSpecs = [
 ['Ludhiana','Amar Singh'],['Ludhiana','Harpreet Kaur'],['Ludhiana','Gurmeet Singh'],['Sangrur','Simran Kaur'],['Sangrur','Baldev Singh'],['Sangrur','Jaspreet Singh'],['Patiala','Manpreet Kaur'],['Patiala','Kuldeep Singh'],['Patiala','Ravinder Singh'],['Karnal','Sandeep Kumar'],['Karnal','Sunita Devi'],['Karnal','Rajesh Kumar'],['Kurukshetra','Anil Kumar'],['Kurukshetra','Pooja Devi'],['Meerut','Vikas Sharma'],
 ] as const;
export const seedUsers: User[] = [
 ...farmerSpecs.map(([district,name],i)=>{const l=LOCATIONS.find(x=>x.district===district)!; return {id:`farmer-${i+1}`,role:'farmer' as const,name,phone:`+91 98765 43${String(i).padStart(2,'0')}`,language:'en' as const,village:district,district,state:l.state,lat:l.lat+(i%3-1)*.025,lng:l.lng+(i%2?-.02:.02)}}),
 ...(['Punjab Pellets Co.','GreenGas Bio-CNG','Mittal Compost Works','SoilSpark Biochar','North Dairy Cooperative','Haryana Power Co-firing'] as const).map((name,i)=>{const district=['Ludhiana','Sangrur','Patiala','Karnal','Kurukshetra','Meerut'][i],l=LOCATIONS.find(x=>x.district===district)!; return {id:`buyer-${i+1}`,role:'buyer' as const,name,phone:'',language:'en' as const,village:l.district,district:l.district,state:l.state,lat:l.lat,lng:l.lng}}),
 {id:'admin-1',role:'admin',name:'HarvestLoop Admin',phone:'',language:'en',village:'Ludhiana',district:'Ludhiana',state:'Punjab',lat:30.901,lng:75.857},
];
const listingFarmerIndexes=[0,3,6,9,12,14,1,10];
export const seedListings: Listing[] = Array.from({length:8},(_,i)=>{const farmer=seedUsers[listingFarmerIndexes[i]], crop=i===4||i===6?'wheat':'paddy', acres=[12,8,15,10,7,18,9,14][i]; const day=String(i+10).padStart(2,'0'); return {id:`listing-${i+1}`,farmerId:farmer.id,crop,acres,estimatedTonnes:acres*(crop==='paddy'?2:1.6),harvestDate:`2026-10-${day}`,availableFrom:`2026-10-${day}`,availableTo:'2026-11-30',lat:farmer.lat,lng:farmer.lng,notes:'Demo listing',status:i===0?'collected':i===1?'paid':'open'};});
export const seedDemands: Demand[] = [
 ['Punjab Pellets Co.','pellets',['paddy','wheat'],60,1900],['GreenGas Bio-CNG','bioCNG',['paddy'],40,2100],['Mittal Compost Works','compost',['paddy','wheat'],32,1500],['SoilSpark Biochar','biochar',['paddy'],25,2300],['North Dairy Cooperative','fodder',['wheat'],22,1800],['Haryana Power Co-firing','cofiring',['paddy','wheat'],80,1650],
].map(([company,product,accepted,tonnes,price],i)=>{const buyer=seedUsers[15+i];return {id:`demand-${i+1}`,buyerId:buyer.id,company:company as string,product:product as Demand['product'],acceptedResidues:accepted as Demand['acceptedResidues'],tonnesNeeded:tonnes as number,pricePerTonne:price as number,lat:buyer.lat,lng:buyer.lng,windowFrom:'2026-10-01',windowTo:'2026-12-15',status:'open'};});
export const seedMatches: Match[] = [
 {id:'match-demo-1',listingId:'listing-1',demandId:'demand-1',score:90,reasons:['Demo match'],status:'collected',pickupDate:'2026-10-20',agreedPricePerTonne:1900},
 {id:'match-demo-2',listingId:'listing-2',demandId:'demand-2',score:88,reasons:['Demo match'],status:'paid',pickupDate:'2026-10-21',agreedPricePerTonne:2100},
];

