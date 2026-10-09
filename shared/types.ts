export type Role = 'farmer' | 'buyer' | 'admin';
export type Language = 'en' | 'hi' | 'pa';
export type Crop = 'paddy' | 'wheat';
export type Product = 'pellets' | 'bioCNG' | 'compost' | 'biochar' | 'fodder' | 'cofiring';
export type Status = 'open' | 'matched' | 'pickup_scheduled' | 'collected' | 'paid';
export type User = { id:string; role:Role; name:string; phone:string; language:Language; village:string; district:string; state:string; lat:number; lng:number };
export type Account = { user:User; passwordHash:string; approved:boolean };
export type Session = { token:string; userId:string; expiresAt:number };
export type Listing = { id:string; farmerId:string; crop:Crop; acres:number; estimatedTonnes:number; harvestDate:string; availableFrom:string; availableTo:string; lat:number; lng:number; notes:string; status:Status };
export type Demand = { id:string; buyerId:string; company:string; product:Product; acceptedResidues:Crop[]; tonnesNeeded:number; pricePerTonne:number; lat:number; lng:number; windowFrom:string; windowTo:string; status:string };
export type Match = { id:string; listingId:string; demandId:string; score:number; reasons:string[]; status:Status; pickupDate:string|null; agreedPricePerTonne:number };
export type Advice = { estimatedTonnes:number; bestUses:string[]; tip:string };
export type Coordinates = { district:string; state:string; lat:number; lng:number };

