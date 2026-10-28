export const runtime='nodejs'
// The legacy endpoint cannot bypass persisted jobs, budgets or the two gates.
export async function POST(){return Response.json({error:'Chức năng AI cũ đã chuyển vào quy trình dự án. Lưu đề bài, chọn model/hạn mức và bắt đầu từ Sản phẩm Win.'},{status:410,headers:{'Cache-Control':'no-store'}})}