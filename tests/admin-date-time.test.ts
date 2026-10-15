import { expect, it } from 'vitest';
import { readEventForm, eventEdit, parseLocal } from '../src/lib/server/admin/service';
function form(time='19:00') {
  const f=new FormData();
  Object.entries({id:'demo',version:'0',startsDate:'2026-10-26',startsTime:time,endsDate:'2026-10-26',endsTime:'22:00',venue:'V39',address:'Demo',description:'',capacity:'30'}).forEach(([key,value])=>f.set(key,value));
  return f;
}
it('combines separate date and 24-hour time without changing Amsterdam scheduling',()=>{
  const parsed=eventEdit.parse(readEventForm(form()));
  expect(parsed.starts).toBe('2026-10-26T19:00');
  expect(parsed.ends).toBe('2026-10-26T22:00');
  expect(parseLocal(parsed.starts)).toBe(Date.parse('2026-10-26T18:00:00Z'));
});
it('rejects AM/PM and invalid times on the server',()=>{
  expect(eventEdit.safeParse(readEventForm(form('7:00 PM'))).success).toBe(false);
  expect(()=>parseLocal(eventEdit.parse(readEventForm(form('25:00'))).starts)).toThrow();
});
