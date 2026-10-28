import { ProjectError } from '../projects/repository'
export class AccessError extends Error {}
const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i
export function assertLocalAccess(request:Request,mutation=false) {
  const host=request.headers.get('host')
  if(!host||!localHost.test(host)) throw new AccessError('Chỉ truy cập từ ứng dụng trên máy này.')
  if(request.headers.get('sec-fetch-site')==='cross-site') throw new AccessError('Yêu cầu từ trang khác bị từ chối.')
  const raw=request.headers.get('origin')
  if(!raw) { if(mutation) throw new AccessError('Thiếu nguồn yêu cầu. Hãy lưu từ giao diện ứng dụng.'); return }
  let origin:URL
  try {origin=new URL(raw)} catch {throw new AccessError('Nguồn yêu cầu không hợp lệ.')}
  if(!['http:','https:'].includes(origin.protocol)||origin.host.toLowerCase()!==host.toLowerCase()||origin.origin!==raw) throw new AccessError('Yêu cầu từ trang khác bị từ chối.')
}
// Keep identifiers separate from arbitrary filesystem paths.
export function assertDraftEdit(status:string) {
  if(status!=='draft') throw new ProjectError('CONFLICT','Dự án đang có tiến trình. Chỉnh sửa phiên bản trong luồng tự chạy sẽ được bổ sung ở Mốc B.')
}