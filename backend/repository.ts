import type { Listing,Demand,Match,Account,Session,User,Role,ApprovalRecord } from '../shared/types';
import { seedListings,seedDemands,seedMatches } from '../shared/seed';
import { seedAccounts,makeAccount,newAccount } from '../backend/auth';
import { DynamoStore } from '../backend/dynamo-store';
import fs from 'node:fs/promises'; import path from 'node:path';
export interface Repository { listings():Promise<Listing[]>; demands():Promise<Demand[]>; matches():Promise<Match[]>; users():Promise<User[]>; addListing(x:Listing):Promise<void>; addDemand(x:Demand):Promise<void>; addMatch(x:Match):Promise<void>; updateMatch(id:string,patch:Partial<Match>):Promise<Match|null>; updateListing(id:string,patch:Partial<Listing>):Promise<void>; updateProfile(id:string,patch:{name:string;phone:string;village:string}):Promise<{user:User}|{error:'not_found'|'phone_taken'}>; login(phone:string,password:string):Promise<{user:User;approved:boolean}|null>; register(input:{role:'farmer'|'buyer';name:string;phone:string;password:string;district:string}):Promise<Account|null>; pendingCompanies():Promise<User[]>; approvalHistory():Promise<ApprovalRecord[]>; approveCompany(id:string,approverId:string):Promise<boolean>; resetAdminPassword(phone:string,password:string):Promise<boolean>; createSession(userId:string):Promise<string>; session(token:string):Promise<User|null>; logout(token:string):Promise<void>; reset():Promise<void> }
type DB={listings:Listing[];demands:Demand[];matches:Match[];accounts:Account[];sessions:Session[]};
export class LocalStore implements Repository {
 private file=path.join(process.cwd(),'data','demo.json');
 private async read():Promise<DB>{try{const db=JSON.parse(await fs.readFile(this.file,'utf8')) as Partial<DB>;return {listings:db.listings??seedListings,demands:db.demands??seedDemands,matches:db.matches??seedMatches,accounts:db.accounts??seedAccounts(),sessions:db.sessions??[]};}catch{return {listings:seedListings,demands:seedDemands,matches:seedMatches,accounts:seedAccounts(),sessions:[]};}}
 private async write(db:DB){await fs.mkdir(path.dirname(this.file),{recursive:true}); await fs.writeFile(this.file,JSON.stringify(db,null,2));}
 async listings(){return (await this.read()).listings;} async demands(){return (await this.read()).demands;} async matches(){return (await this.read()).matches;} async users(){return (await this.read()).accounts.map(a=>a.user);}
 async addListing(x:Listing){const d=await this.read();d.listings.push(x);await this.write(d);} async addDemand(x:Demand){const d=await this.read();d.demands.push(x);await this.write(d);} async addMatch(x:Match){const d=await this.read();d.matches.push(x);await this.write(d);}
 async updateMatch(id:string,patch:Partial<Match>){const d=await this.read(),m=d.matches.find(x=>x.id===id);if(!m)return null;Object.assign(m,patch);await this.write(d);return m;}
 async updateListing(id:string,patch:Partial<Listing>){const d=await this.read(),l=d.listings.find(x=>x.id===id);if(l){Object.assign(l,patch);await this.write(d);}}
 async updateProfile(id:string,patch:{name:string;phone:string;village:string}){const d=await this.read(),account=d.accounts.find(x=>x.user.id===id);if(!account)return {error:'not_found'} as const;if(d.accounts.some(x=>x.user.id!==id&&x.user.phone===patch.phone))return {error:'phone_taken'} as const;Object.assign(account.user,patch);await this.write(d);return {user:account.user} as const;}
 async login(phone:string,password:string){const d=await this.read(),a=d.accounts.find(x=>x.user.phone===phone);if(!a||!makeAccount.verify(password,a.passwordHash))return null;return {user:a.user,approved:a.approved};}
 async register(input:{role:'farmer'|'buyer';name:string;phone:string;password:string;district:string}){const d=await this.read();if(d.accounts.some(a=>a.user.phone===input.phone))return null;const a=newAccount(input.role,input.name,input.phone,input.password,input.district);d.accounts.push(a);await this.write(d);return a;}
 async pendingCompanies(){return (await this.read()).accounts.filter(a=>a.user.role==='buyer'&&!a.approved).map(a=>a.user);}
 async approvalHistory(){return (await this.read()).accounts.filter(a=>a.user.role==='buyer'&&a.approved).map(({user,approvedAt,approvedBy})=>({user,approvedAt,approvedBy})).sort((a,b)=>(b.approvedAt??'').localeCompare(a.approvedAt??''));}
 async approveCompany(id:string,approverId:string){const d=await this.read(),a=d.accounts.find(x=>x.user.id===id&&x.user.role==='buyer'&&!x.approved);if(!a)return false;a.approved=true;a.approvedAt=new Date().toISOString();a.approvedBy=approverId;await this.write(d);return true;}
 async resetAdminPassword(phone:string,password:string){const d=await this.read(),a=d.accounts.find(x=>x.user.role==='admin'&&x.user.phone===phone);if(!a)return false;a.passwordHash=makeAccount.create(a.user,password).passwordHash;d.sessions=d.sessions.filter(session=>session.userId!==a.user.id);await this.write(d);return true;}
 async createSession(userId:string){const d=await this.read(),token=crypto.randomUUID()+crypto.randomUUID();d.sessions=d.sessions.filter(s=>s.expiresAt>Date.now());d.sessions.push({token,userId,expiresAt:Date.now()+7*24*60*60*1000});await this.write(d);return token;}
 async session(token:string){const d=await this.read(),s=d.sessions.find(x=>x.token===token&&x.expiresAt>Date.now());return s?.userId?d.accounts.find(a=>a.user.id===s.userId)?.user??null:null;}
 async logout(token:string){const d=await this.read();d.sessions=d.sessions.filter(s=>s.token!==token);await this.write(d);}
 async reset(){const d=await this.read();await this.write({listings:seedListings,demands:seedDemands,matches:seedMatches,accounts:d.accounts,sessions:d.sessions});}
}
export const store:Repository=process.env.USE_AWS==='true'?new DynamoStore():new LocalStore();

