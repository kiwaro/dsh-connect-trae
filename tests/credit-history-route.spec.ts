import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { registerTraeUsageRoute, type TraeUsageRouteOptions } from '../src/web-status.ts'
import { TRAE_CREDIT_HISTORY_PATH } from '../src/status-paths.ts'
interface Entry { path: string; handler(req: unknown,res: unknown): Promise<unknown> }
describe('credit history route',()=>{
 it('guards origin and method, scopes account lookup and returns local evidence only',async()=>{
  const entries:Entry[]=[]
  const ctx=new Context()
  await ctx.plugin({name:'webServer',apply(scope:Context){scope.provide('webServer',{register:(entry:Entry)=>{entries.push(entry);return ()=>{}}})}})
  let called=0
  const options={creditHistoryOf:async(panel:string,account:string)=>{called++;expect(panel).toBe('cn');expect(account).toBe('demo-a');return {source:'account-snapshot-diff',scope:'account',events:[],balance:10,at:1,dropped:0}}} as unknown as TraeUsageRouteOptions
  registerTraeUsageRoute(ctx,options)
  await ctx.fiber.dispose()
  const entry=entries.find(e=>e.path===TRAE_CREDIT_HISTORY_PATH)!
  const call=async(method:string,url:string,origin='http://localhost:3000')=>{
   let status=0;let body=''
   await entry.handler({method,url,headers:{origin,host:'localhost:3000'}},{writeHead:(n:number)=>{status=n},end:(value:string)=>{body=value}})
   return {status,body}
  }
  expect((await call('POST',TRAE_CREDIT_HISTORY_PATH)).status).toBe(405)
  expect((await call('GET',TRAE_CREDIT_HISTORY_PATH+'?accountId=demo-a','https://untrusted.invalid')).status).toBe(403)
  expect((await call('GET',TRAE_CREDIT_HISTORY_PATH)).status).toBe(400)
  const result=await call('GET',TRAE_CREDIT_HISTORY_PATH+'?region=cn&accountId=demo-a')
  expect(result.status).toBe(200);expect(JSON.parse(result.body).scope).toBe('account');expect(called).toBe(1)
 })
})
