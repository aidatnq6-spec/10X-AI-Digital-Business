// Dữ liệu 5 hệ thống. Chỉnh nội dung dây chuyền, lựa chọn và thành phẩm tại đây.
import type { System } from '@/lib/types'

export const SYSTEMS: System[] = [
  {
    "id": 1,
    "slug": "he-thong-1",
    "name": "Sản phẩm Win",
    "verb": "làm sản phẩm",
    "agentHours": 120,
    "tint": [
      "#6fd3ff",
      "#1d5fa8"
    ],
    "blurb": "Từ chuyên gia trong đầu thành sản phẩm khách muốn mua.",
    "bullets": [
      "Biết chính xác khách đang cần gì, trước khi làm",
      "Một ebook hoàn chỉnh mang tên và gương mặt bạn",
      "Trọn bộ đi kèm: sổ tay, bài học, bài đăng, trang bán, email"
    ],
    "question": "Có phải bạn biết rất nhiều, nhưng chưa có một sản phẩm nào để bán?",
    "ask": "Bạn muốn đội AI làm gì?",
    "rows": [
      {
        "key": "niche",
        "label": "Ngách",
        "options": [
          "Fitness",
          "Nấu ăn",
          "Tài chính cá nhân",
          "Tiếng Anh giao tiếp"
        ]
      },
      {
        "key": "who",
        "label": "Bán cho",
        "options": [
          "Người mới bắt đầu",
          "Dân văn phòng",
          "Mẹ bỉm sau sinh",
          "Người trên 40 tuổi"
        ]
      },
      {
        "key": "fmt",
        "label": "Sản phẩm",
        "options": [
          "Ebook",
          "Khóa mini",
          "Bộ template"
        ]
      },
      {
        "key": "price",
        "label": "Giá bán",
        "options": [
          "Dưới 200k",
          "200k – 500k",
          "Trên 500k"
        ]
      }
    ],
    "stations": [
      {
        "name": "Tìm nhu cầu",
        "agent": "Agent thị trường",
        "headline": "Bản đồ nhu cầu: 6 chủ đề {niche} được hỏi nhiều nhất",
        "checks": [
          "Từ ít nhất 3 nguồn dữ liệu",
          "Từ 100 câu hỏi thật",
          "Xếp hạng theo mức quan tâm"
        ],
        "bars": [
          "{niche} cho {who}",
          "Lỗi thường gặp khi mới bắt đầu",
          "Kế hoạch 30 ngày đầu tiên"
        ],
        "gives": []
      },
      {
        "name": "Hiểu khách hàng",
        "agent": "Agent chân dung",
        "headline": "Chân dung: {who}, đã tự học nhưng bỏ dở sau 2 tuần",
        "checks": [
          "Nỗi đau chính",
          "Điều khiến họ do dự",
          "Lý do sẵn sàng trả {price}"
        ],
        "bars": [
          "Thiếu kế hoạch rõ ràng",
          "Không biết bắt đầu từ đâu",
          "Sợ tốn tiền vô ích"
        ],
        "gives": []
      },
      {
        "name": "Soi đối thủ",
        "agent": "Agent đối thủ",
        "headline": "12 sản phẩm cùng loại, 9 cái thiếu kế hoạch từng bước",
        "checks": [
          "Đã quét 12 sản phẩm",
          "Đã đọc đánh giá thấp điểm",
          "Tìm ra khoảng trống để thắng"
        ],
        "bars": [
          "Thiếu lộ trình",
          "Quá nhiều lý thuyết",
          "Không có bài tập"
        ],
        "gives": []
      },
      {
        "name": "Chốt sản phẩm",
        "agent": "Agent sản phẩm",
        "headline": "Chốt: {fmt} {niche} cho {who}, giá {price}",
        "checks": [
          "Tên sản phẩm",
          "Lời hứa kết quả",
          "Mức giá {price}"
        ],
        "bars": [
          "Phù hợp nhu cầu",
          "Khác biệt với đối thủ",
          "Dễ làm trong 1 tuần"
        ],
        "gives": []
      },
      {
        "name": "Lên dàn ý",
        "agent": "Agent biên tập",
        "headline": "Dàn ý 6 chương, 24 bài thực hành",
        "checks": [
          "6 chương theo lộ trình",
          "24 bài thực hành",
          "Bài kiểm tra cuối chương"
        ],
        "bars": [
          "Chương 1–2: nền tảng",
          "Chương 3–4: thực hành",
          "Chương 5–6: duy trì"
        ],
        "gives": []
      },
      {
        "name": "Viết nội dung",
        "agent": "Agent nội dung",
        "headline": "Viết xong 6 chương theo giọng của bạn",
        "checks": [
          "Đã viết 6 chương",
          "Đã thêm ví dụ thực tế",
          "Giọng văn thống nhất"
        ],
        "bars": [
          "Chương đã viết",
          "Bài thực hành",
          "Ví dụ minh họa"
        ],
        "gives": [
          0,
          1,
          2
        ]
      },
      {
        "name": "Thiết kế",
        "agent": "Agent thiết kế",
        "headline": "Đề xuất 3 phong cách bìa, chờ bạn duyệt",
        "checks": [
          "Bìa ebook",
          "Ảnh bìa bài đăng",
          "Màu và chữ thống nhất"
        ],
        "bars": [
          "Phong cách thể thao",
          "Điện ảnh tối",
          "Tạp chí"
        ],
        "gives": [
          3,
          4
        ]
      },
      {
        "name": "Kiểm tra & đóng gói",
        "agent": "Agent kiểm định",
        "headline": "Soát lỗi, đối chiếu dàn ý, đóng gói 7 thành phẩm",
        "checks": [
          "Soát chính tả",
          "Đối chiếu với dàn ý",
          "Gói thành bộ sản phẩm"
        ],
        "bars": [
          "Lỗi đã sửa",
          "Mục khớp dàn ý",
          "Thành phẩm sẵn sàng"
        ],
        "gives": [
          5,
          6
        ]
      }
    ],
    "approveAt": 6,
    "approve": {
      "title": "Chọn phong cách bìa",
      "cover": true,
      "button": "Đồng ý đề xuất",
      "note": "Dựng từ ảnh đã cá nhân hóa. Bìa đi theo mọi sản phẩm.",
      "options": [
        {
          "name": "Đậm thể thao",
          "desc": "Nền đen, chữ đậm, điểm nhấn xanh neon như sách tập bán chạy.",
          "score": 94,
          "style": "sport"
        },
        {
          "name": "Điện ảnh tối",
          "desc": "Ảnh tràn bìa dưới ánh đèn, chữ in hoa sáng.",
          "score": 81,
          "style": "noir"
        },
        {
          "name": "Tạp chí",
          "desc": "Tên sách lớn trên đầu, dòng tít bên cạnh.",
          "score": 66,
          "style": "mag"
        }
      ]
    },
    "kit": [
      {
        "name": "Ebook 48 trang",
        "desc": "Sách chính theo lộ trình 30 ngày",
        "kind": "Ebook",
        "outline": [
          "Chương 1 · Vì sao {who} bỏ dở {niche}",
          "Chương 2 · Kế hoạch 30 ngày đầu",
          "Chương 3 · Sai lầm thường gặp",
          "Chương 4–6 · Thực hành theo tuần",
          "Bài tập cuối mỗi chương"
        ]
      },
      {
        "name": "Sổ tay thực hành",
        "desc": "Bảng theo dõi và checklist",
        "kind": "Sổ tay",
        "outline": [
          "Bảng theo dõi 30 ngày",
          "Checklist mỗi tuần",
          "Trang ghi chép kết quả",
          "Mục tiêu tuần kế tiếp"
        ]
      },
      {
        "name": "Bài học trên app",
        "desc": "24 bài ngắn, 5 phút mỗi bài",
        "kind": "App",
        "outline": [
          "24 bài học ngắn",
          "Nhắc việc mỗi ngày",
          "Câu hỏi kiểm tra cuối tuần",
          "Huy hiệu hoàn thành"
        ]
      },
      {
        "name": "Bộ bài đăng",
        "desc": "5 bài đăng giới thiệu",
        "kind": "Bài đăng",
        "outline": [
          "5 bài đăng cho 7 ngày",
          "Câu mở đầu theo nỗi đau của {who}",
          "Lời kêu gọi mua, giá {price}",
          "Gợi ý ảnh bìa đi kèm"
        ]
      },
      {
        "name": "Video ngắn",
        "desc": "3 kịch bản 45 giây",
        "kind": "Video",
        "outline": [
          "Kịch bản 1 · Sai lầm số một",
          "Kịch bản 2 · Kế hoạch 7 ngày",
          "Kịch bản 3 · Trước và sau",
          "Hook trong 3 giây đầu"
        ]
      },
      {
        "name": "Trang bán",
        "desc": "Một trang, một nút mua",
        "kind": "Trang bán",
        "outline": [
          "Tiêu đề nêu kết quả cụ thể",
          "Nỗi đau và cách giải quyết",
          "Mục lục {fmt}",
          "Khung cho phản hồi thật của khách",
          "Nút mua, giá {price}"
        ]
      },
      {
        "name": "Chuỗi email 5 thư",
        "desc": "Từ chào mừng đến chốt đơn",
        "kind": "Email",
        "outline": [
          "Email 1 · Chào mừng và quà tặng",
          "Email 2 · Câu chuyện nỗi đau",
          "Email 3 · Giới thiệu {fmt}",
          "Email 4 · Giải đáp phản đối",
          "Email 5 · Đóng ưu đãi"
        ]
      }
    ]
  },
  {
    "id": 2,
    "slug": "he-thong-2",
    "name": "Kênh Video AI",
    "verb": "dựng kênh video",
    "agentHours": 96,
    "tint": [
      "#ffc27a",
      "#a8551d"
    ],
    "blurb": "Thu hút khách hàng tiềm năng tự động trên internet.",
    "bullets": [
      "30 kịch bản video theo chủ đề khách đang tìm",
      "Giọng đọc, phụ đề và hình dựng sẵn",
      "Lịch đăng 30 ngày cho từng nền tảng"
    ],
    "question": "Bạn có nội dung hay nhưng không có thời gian đứng trước máy quay?",
    "ask": "Kênh của bạn nói về gì?",
    "rows": [
      {
        "key": "niche",
        "label": "Ngách",
        "options": [
          "Fitness",
          "Nấu ăn",
          "Tài chính cá nhân",
          "Tiếng Anh giao tiếp"
        ]
      },
      {
        "key": "plat",
        "label": "Nền tảng",
        "options": [
          "YouTube Shorts",
          "TikTok",
          "Facebook Reels"
        ]
      },
      {
        "key": "len",
        "label": "Độ dài",
        "options": [
          "30 giây",
          "60 giây",
          "3 phút"
        ]
      },
      {
        "key": "freq",
        "label": "Tần suất",
        "options": [
          "2 video/tuần",
          "3 video/tuần",
          "Mỗi ngày"
        ]
      }
    ],
    "stations": [
      {
        "name": "Tìm chủ đề",
        "agent": "Agent xu hướng",
        "headline": "40 chủ đề {niche} đang được tìm kiếm trên {plat}",
        "checks": [
          "Quét chủ đề đang lên",
          "Loại chủ đề đã bão hòa",
          "Xếp theo khả năng lan truyền"
        ],
        "bars": [
          "Chủ đề mới nổi",
          "Câu hỏi lặp lại",
          "Từ khóa ít cạnh tranh"
        ],
        "gives": []
      },
      {
        "name": "Viết kịch bản",
        "agent": "Agent biên kịch",
        "headline": "30 kịch bản {len}, mở đầu giữ chân trong 3 giây",
        "checks": [
          "Hook 3 giây đầu",
          "Cấu trúc 3 phần",
          "Lời kêu gọi cuối video"
        ],
        "bars": [
          "Kịch bản đã viết",
          "Hook thử nghiệm",
          "Lời kêu gọi"
        ],
        "gives": [
          0
        ]
      },
      {
        "name": "Giọng đọc & phụ đề",
        "agent": "Agent âm thanh",
        "headline": "Giọng đọc tiếng Việt tự nhiên, phụ đề khớp từng câu",
        "checks": [
          "Chọn giọng đọc",
          "Căn phụ đề theo nhịp",
          "Chỉnh tốc độ cho {plat}"
        ],
        "bars": [
          "Câu đã căn",
          "Giây phụ đề",
          "Giọng thử"
        ],
        "gives": [
          1
        ]
      },
      {
        "name": "Dựng hình",
        "agent": "Agent dựng phim",
        "headline": "Dựng 3 video mẫu {len}, tỉ lệ dọc 9:16",
        "checks": [
          "Cảnh minh họa theo kịch bản",
          "Chuyển cảnh gọn",
          "Xuất đúng tỉ lệ"
        ],
        "bars": [
          "Cảnh đã dựng",
          "Giây video",
          "Bản xuất"
        ],
        "gives": [
          2
        ]
      },
      {
        "name": "Thumbnail & tiêu đề",
        "agent": "Agent thiết kế",
        "headline": "Mỗi video có 3 tiêu đề và 3 ảnh bìa để thử",
        "checks": [
          "3 tiêu đề mỗi video",
          "3 ảnh bìa mỗi video",
          "Chữ đọc được trên điện thoại"
        ],
        "bars": [
          "Tiêu đề",
          "Ảnh bìa",
          "Điểm hấp dẫn"
        ],
        "gives": [
          3
        ]
      },
      {
        "name": "Lịch đăng",
        "agent": "Agent vận hành",
        "headline": "Lịch đăng 30 ngày, {freq}, giờ vàng của {plat}",
        "checks": [
          "Xếp lịch theo {freq}",
          "Gắn tiêu đề và mô tả",
          "Nhắc đăng đúng giờ"
        ],
        "bars": [
          "Ngày đã xếp",
          "Bài đã gắn",
          "Giờ đăng"
        ],
        "gives": [
          4
        ]
      }
    ],
    "approveAt": 1,
    "approve": {
      "title": "Chọn kiểu mở đầu video",
      "cover": false,
      "button": "Dùng kiểu đã chọn",
      "note": "Kiểu mở đầu được áp cho cả 30 kịch bản.",
      "options": [
        {
          "name": "Câu hỏi gây tò mò",
          "desc": "Mở bằng một câu hỏi khách đang tự hỏi.",
          "score": 92
        },
        {
          "name": "Con số bất ngờ",
          "desc": "Mở bằng một số liệu khiến người xem dừng lại.",
          "score": 84
        },
        {
          "name": "Sai lầm phổ biến",
          "desc": "Mở bằng điều đa số mọi người đang làm sai.",
          "score": 77
        }
      ]
    },
    "kit": [
      {
        "name": "30 kịch bản",
        "desc": "Mỗi kịch bản {len}",
        "kind": "Kịch bản",
        "outline": [
          "Chủ đề và hook của từng video",
          "Nội dung 3 phần",
          "Lời kêu gọi cuối video",
          "Gợi ý hình minh họa"
        ]
      },
      {
        "name": "Bộ giọng và phụ đề",
        "desc": "Giọng đọc và file phụ đề",
        "kind": "Âm thanh",
        "outline": [
          "Giọng đọc đã chọn",
          "Phụ đề từng câu",
          "Tốc độ đọc cho {plat}"
        ]
      },
      {
        "name": "3 video mẫu",
        "desc": "Tỉ lệ dọc 9:16",
        "kind": "Video",
        "outline": [
          "Video 1 · chủ đề dẫn đầu",
          "Video 2 · chủ đề thứ hai",
          "Video 3 · chủ đề thứ ba"
        ]
      },
      {
        "name": "Thumbnail và tiêu đề",
        "desc": "3 phương án mỗi video",
        "kind": "Thiết kế",
        "outline": [
          "3 tiêu đề mỗi video",
          "3 ảnh bìa mỗi video",
          "Cách chọn bản thắng"
        ]
      },
      {
        "name": "Lịch đăng 30 ngày",
        "desc": "Theo {freq}",
        "kind": "Lịch",
        "outline": [
          "Ngày và giờ đăng",
          "Tiêu đề, mô tả, thẻ",
          "Nhắc việc mỗi ngày"
        ]
      }
    ]
  },
  {
    "id": 3,
    "slug": "he-thong-3",
    "name": "Chuyển đổi",
    "verb": "dựng phễu bán hàng",
    "agentHours": 84,
    "tint": [
      "#c9a7ff",
      "#5a2fa8"
    ],
    "blurb": "Biến lượt xem thành người trả tiền.",
    "bullets": [
      "Trang bán và chuỗi email viết theo nỗi đau của khách",
      "Ưu đãi có hạn rõ ràng",
      "Bảng theo dõi số người xem, bấm và mua"
    ],
    "question": "Có người xem rồi, nhưng chưa ai bấm mua?",
    "ask": "Bạn muốn bán gì, cho ai?",
    "rows": [
      {
        "key": "fmt",
        "label": "Sản phẩm",
        "options": [
          "Ebook",
          "Khóa mini",
          "Bộ template"
        ]
      },
      {
        "key": "src",
        "label": "Nguồn khách",
        "options": [
          "Video ngắn",
          "Facebook",
          "Danh sách email"
        ]
      },
      {
        "key": "offer",
        "label": "Ưu đãi",
        "options": [
          "Giảm 30% trong 48 giờ",
          "Tặng kèm sổ tay",
          "Dùng thử 3 bài đầu"
        ]
      },
      {
        "key": "price",
        "label": "Giá bán",
        "options": [
          "Dưới 200k",
          "200k – 500k",
          "Trên 500k"
        ]
      }
    ],
    "stations": [
      {
        "name": "Viết trang bán",
        "agent": "Agent bán hàng",
        "headline": "Trang bán một cột cho {fmt}, khách đến từ {src}",
        "checks": [
          "Tiêu đề nêu kết quả",
          "Phần nỗi đau",
          "Nút mua rõ ràng"
        ],
        "bars": [
          "Mục trang",
          "Từ khóa chính",
          "Nút mua"
        ],
        "gives": [
          0
        ]
      },
      {
        "name": "Chuỗi email",
        "agent": "Agent email",
        "headline": "5 thư dẫn khách từ làm quen đến mua, ưu đãi: {offer}",
        "checks": [
          "Thư chào mừng",
          "Thư giải đáp phản đối",
          "Thư đóng ưu đãi"
        ],
        "bars": [
          "Thư đã viết",
          "Dòng tiêu đề",
          "Lời kêu gọi"
        ],
        "gives": [
          1
        ]
      },
      {
        "name": "Bài đăng quảng bá",
        "agent": "Agent nội dung",
        "headline": "7 bài đăng dẫn về trang bán, đúng giọng của {src}",
        "checks": [
          "Mở đầu theo nỗi đau",
          "Lời kêu gọi một việc",
          "Lịch đăng 7 ngày"
        ],
        "bars": [
          "Bài đăng",
          "Hook",
          "Lịch"
        ],
        "gives": [
          2
        ]
      },
      {
        "name": "Thanh toán",
        "agent": "Agent vận hành",
        "headline": "Quy trình thanh toán 3 bước cho mức giá {price}",
        "checks": [
          "Chọn cổng thanh toán",
          "Gửi sản phẩm sau khi trả tiền",
          "Gửi hóa đơn"
        ],
        "bars": [
          "Bước thanh toán",
          "Thông báo",
          "Mẫu hóa đơn"
        ],
        "gives": [
          3
        ]
      },
      {
        "name": "Theo dõi chuyển đổi",
        "agent": "Agent phân tích",
        "headline": "Bảng theo dõi từ lượt xem đến đơn hàng",
        "checks": [
          "Đếm lượt xem trang",
          "Đếm lượt bấm mua",
          "Đếm đơn thành công"
        ],
        "bars": [
          "Lượt xem",
          "Lượt bấm",
          "Đơn hàng"
        ],
        "gives": [
          4
        ]
      }
    ],
    "approveAt": 1,
    "approve": {
      "title": "Chọn giọng trang bán",
      "cover": false,
      "button": "Dùng giọng đã chọn",
      "note": "Giọng này áp cho trang bán, email và bài đăng.",
      "options": [
        {
          "name": "Thẳng và gọn",
          "desc": "Nêu kết quả, giá, nút mua. Không vòng vo.",
          "score": 90
        },
        {
          "name": "Kể chuyện",
          "desc": "Mở bằng câu chuyện của khách rồi mới đến sản phẩm.",
          "score": 83
        },
        {
          "name": "Chuyên gia",
          "desc": "Số liệu và lập luận, giọng điềm tĩnh.",
          "score": 74
        }
      ]
    },
    "kit": [
      {
        "name": "Trang bán",
        "desc": "Một trang, một nút mua",
        "kind": "Trang bán",
        "outline": [
          "Tiêu đề nêu kết quả",
          "Nỗi đau và giải pháp",
          "Mục lục {fmt}",
          "Khung phản hồi thật của khách",
          "Nút mua, giá {price}"
        ]
      },
      {
        "name": "Chuỗi email 5 thư",
        "desc": "Từ chào đến chốt",
        "kind": "Email",
        "outline": [
          "Email 1 · Chào mừng",
          "Email 2 · Nỗi đau",
          "Email 3 · Giới thiệu",
          "Email 4 · Giải đáp phản đối",
          "Email 5 · {offer}"
        ]
      },
      {
        "name": "Bộ bài đăng",
        "desc": "7 bài trong 7 ngày",
        "kind": "Bài đăng",
        "outline": [
          "Câu mở đầu từng bài",
          "Lời kêu gọi",
          "Lịch đăng"
        ]
      },
      {
        "name": "Quy trình thanh toán",
        "desc": "3 bước, tự động",
        "kind": "Vận hành",
        "outline": [
          "Chọn cổng thanh toán",
          "Gửi sản phẩm tự động",
          "Gửi hóa đơn"
        ]
      },
      {
        "name": "Bảng theo dõi",
        "desc": "Xem, bấm, mua",
        "kind": "Bảng",
        "outline": [
          "Lượt xem trang",
          "Tỉ lệ bấm mua",
          "Tỉ lệ thanh toán thành công"
        ]
      }
    ]
  },
  {
    "id": 4,
    "slug": "he-thong-4",
    "name": "Giao hàng & CSKH",
    "verb": "dựng chăm sóc khách",
    "agentHours": 72,
    "tint": [
      "#7df0c0",
      "#1d7a5a"
    ],
    "blurb": "Giao sản phẩm và trả lời khách tự động 24/7.",
    "bullets": [
      "Khách trả tiền xong nhận sản phẩm ngay",
      "40 câu trả lời mẫu theo đúng giọng của bạn",
      "Quy tắc chuyển cho người thật khi cần"
    ],
    "question": "Mỗi lần có đơn mới, bạn lại phải gửi file và trả lời tin nhắn bằng tay?",
    "ask": "Khách của bạn nhắn ở đâu?",
    "rows": [
      {
        "key": "chan",
        "label": "Kênh",
        "options": [
          "Zalo",
          "Messenger",
          "Email"
        ]
      },
      {
        "key": "tone",
        "label": "Giọng",
        "options": [
          "Thân thiện",
          "Chuyên nghiệp",
          "Ngắn gọn"
        ]
      },
      {
        "key": "hours",
        "label": "Giờ trực",
        "options": [
          "24/7",
          "8h – 22h"
        ]
      },
      {
        "key": "hand",
        "label": "Chuyển người",
        "options": [
          "Khi khách bực",
          "Khi hỏi hoàn tiền",
          "Khi AI không chắc"
        ]
      }
    ],
    "stations": [
      {
        "name": "Giao hàng tự động",
        "agent": "Agent giao hàng",
        "headline": "Khách thanh toán xong, nhận file qua {chan} trong 1 phút",
        "checks": [
          "Kích hoạt khi có đơn",
          "Gửi file và hướng dẫn",
          "Ghi nhận đã giao"
        ],
        "bars": [
          "Đơn thử",
          "Giây gửi",
          "Lỗi"
        ],
        "gives": [
          0
        ]
      },
      {
        "name": "Kịch bản trả lời",
        "agent": "Agent CSKH",
        "headline": "40 câu trả lời mẫu, giọng {tone}",
        "checks": [
          "Gom câu hỏi thường gặp",
          "Viết giọng {tone}",
          "Gắn đường dẫn hỗ trợ"
        ],
        "bars": [
          "Câu hỏi",
          "Câu trả lời",
          "Đường dẫn"
        ],
        "gives": [
          1
        ]
      },
      {
        "name": "Kho câu hỏi",
        "agent": "Agent tri thức",
        "headline": "Kho 60 câu hỏi, AI tìm đúng câu trả lời",
        "checks": [
          "Phân nhóm câu hỏi",
          "Gắn từ khóa",
          "Đánh dấu câu nhạy cảm"
        ],
        "bars": [
          "Nhóm",
          "Từ khóa",
          "Câu nhạy cảm"
        ],
        "gives": []
      },
      {
        "name": "Xử lý khiếu nại",
        "agent": "Agent xử lý",
        "headline": "Quy tắc xin lỗi, bồi hoàn, chuyển người: {hand}",
        "checks": [
          "Nhận biết khách bực",
          "Quy tắc hoàn tiền",
          "Chuyển {hand}"
        ],
        "bars": [
          "Tình huống",
          "Quy tắc",
          "Chuyển người"
        ],
        "gives": [
          2
        ]
      },
      {
        "name": "Kiểm thử",
        "agent": "Agent kiểm định",
        "headline": "Thử 30 tình huống giả lập, trực {hours} trên {chan}",
        "checks": [
          "Chạy 30 tình huống",
          "Đo thời gian trả lời",
          "Ghi lỗi cần sửa"
        ],
        "bars": [
          "Tình huống",
          "Giây trả lời",
          "Lỗi đã sửa"
        ],
        "gives": [
          3
        ]
      }
    ],
    "approveAt": 3,
    "approve": {
      "title": "Chọn mức tự động",
      "cover": false,
      "button": "Dùng mức đã chọn",
      "note": "Bạn có thể đổi lại bất kỳ lúc nào.",
      "options": [
        {
          "name": "AI trả lời, báo bạn sau",
          "desc": "Tốc độ cao nhất. Bạn xem báo cáo cuối ngày.",
          "score": 88
        },
        {
          "name": "AI hỏi trước khi hoàn tiền",
          "desc": "Chuyển cho bạn mọi yêu cầu liên quan đến tiền.",
          "score": 91
        },
        {
          "name": "AI soạn, bạn duyệt",
          "desc": "An toàn nhất. Chậm hơn.",
          "score": 70
        }
      ]
    },
    "kit": [
      {
        "name": "Email giao hàng",
        "desc": "Gửi tự động sau thanh toán",
        "kind": "Email",
        "outline": [
          "Tiêu đề thân thiện",
          "Đường dẫn tải sản phẩm",
          "Hướng dẫn bắt đầu"
        ]
      },
      {
        "name": "40 câu trả lời mẫu",
        "desc": "Giọng {tone}",
        "kind": "Kịch bản",
        "outline": [
          "Câu hỏi về cách dùng",
          "Câu hỏi về thanh toán",
          "Câu hỏi về hoàn tiền",
          "Lời cảm ơn và xin lỗi"
        ]
      },
      {
        "name": "Quy tắc chuyển người",
        "desc": "Khi AI cần bạn",
        "kind": "Quy tắc",
        "outline": [
          "Điều kiện: {hand}",
          "Cách báo cho bạn",
          "Thời gian phản hồi mục tiêu"
        ]
      },
      {
        "name": "Báo cáo kiểm thử",
        "desc": "30 tình huống",
        "kind": "Báo cáo",
        "outline": [
          "Tình huống đạt",
          "Tình huống cần sửa",
          "Đề xuất cải thiện"
        ]
      }
    ]
  },
  {
    "id": 5,
    "slug": "he-thong-5",
    "name": "Quản trị",
    "verb": "dựng bảng quản trị",
    "agentHours": 60,
    "tint": [
      "#ffd56f",
      "#a87a1d"
    ],
    "blurb": "Doanh thu, lợi nhuận và dòng tiền trong một màn hình.",
    "bullets": [
      "Doanh thu và chi phí gom về một nơi",
      "Lợi nhuận tính tự động",
      "Cảnh báo khi chi phí vượt hoặc doanh thu giảm"
    ],
    "question": "Cuối tháng mới biết lời hay lỗ?",
    "ask": "Bạn muốn theo dõi gì?",
    "rows": [
      {
        "key": "metric",
        "label": "Chỉ số chính",
        "options": [
          "Doanh thu",
          "Lợi nhuận",
          "Dòng tiền"
        ]
      },
      {
        "key": "cycle",
        "label": "Chu kỳ",
        "options": [
          "Hằng ngày",
          "Hằng tuần",
          "Hằng tháng"
        ]
      },
      {
        "key": "goal",
        "label": "Mục tiêu tháng",
        "options": [
          "10 triệu",
          "30 triệu",
          "100 triệu"
        ]
      },
      {
        "key": "alert",
        "label": "Cảnh báo",
        "options": [
          "Chi phí vượt",
          "Doanh thu giảm",
          "Cả hai"
        ]
      }
    ],
    "stations": [
      {
        "name": "Gom số liệu",
        "agent": "Agent dữ liệu",
        "headline": "Gom doanh thu và chi phí về một bảng, tính {cycle}",
        "checks": [
          "Nguồn doanh thu",
          "Nguồn chi phí",
          "Đối chiếu số dư"
        ],
        "bars": [
          "Nguồn",
          "Dòng dữ liệu",
          "Lệch"
        ],
        "gives": [
          0
        ]
      },
      {
        "name": "Tính lợi nhuận",
        "agent": "Agent kế toán",
        "headline": "Lợi nhuận từng sản phẩm, so với mục tiêu {goal}",
        "checks": [
          "Chia chi phí theo sản phẩm",
          "Tính lợi nhuận gộp",
          "So với mục tiêu {goal}"
        ],
        "bars": [
          "Sản phẩm",
          "Khoản chi",
          "Chênh mục tiêu"
        ],
        "gives": [
          1
        ]
      },
      {
        "name": "Dòng tiền",
        "agent": "Agent dòng tiền",
        "headline": "Dự báo dòng tiền 90 ngày dựa trên {metric}",
        "checks": [
          "Tiền vào theo tuần",
          "Tiền ra theo tuần",
          "Điểm thấp nhất"
        ],
        "bars": [
          "Tuần",
          "Khoản",
          "Dự báo"
        ],
        "gives": [
          2
        ]
      },
      {
        "name": "Cảnh báo",
        "agent": "Agent giám sát",
        "headline": "Cảnh báo khi: {alert}",
        "checks": [
          "Ngưỡng cảnh báo",
          "Cách báo cho bạn",
          "Kiểm thử cảnh báo"
        ],
        "bars": [
          "Ngưỡng",
          "Lần thử",
          "Báo đúng"
        ],
        "gives": [
          3
        ]
      },
      {
        "name": "Báo cáo tuần",
        "agent": "Agent báo cáo",
        "headline": "Báo cáo một trang gửi vào cuối {cycle}",
        "checks": [
          "Tóm tắt số chính",
          "3 việc nên làm",
          "Gửi tự động"
        ],
        "bars": [
          "Chỉ số",
          "Việc cần làm",
          "Lần gửi"
        ],
        "gives": [
          4
        ]
      }
    ],
    "approveAt": 3,
    "approve": {
      "title": "Chọn khung báo cáo",
      "cover": false,
      "button": "Dùng khung đã chọn",
      "note": "Khung này dùng cho mọi báo cáo sau.",
      "options": [
        {
          "name": "Một con số lớn",
          "desc": "Chỉ số chính nổi bật, chi tiết gọn bên dưới.",
          "score": 89
        },
        {
          "name": "Bảng so sánh",
          "desc": "Tháng này so với tháng trước, theo sản phẩm.",
          "score": 82
        },
        {
          "name": "Câu chuyện bằng chữ",
          "desc": "AI viết 5 câu tóm tắt tình hình.",
          "score": 71
        }
      ]
    },
    "kit": [
      {
        "name": "Bảng doanh thu",
        "desc": "Theo sản phẩm và kênh",
        "kind": "Bảng",
        "outline": [
          "Doanh thu theo ngày",
          "Theo sản phẩm",
          "Theo nguồn khách"
        ]
      },
      {
        "name": "Báo cáo lợi nhuận",
        "desc": "So với mục tiêu {goal}",
        "kind": "Báo cáo",
        "outline": [
          "Lợi nhuận gộp",
          "Chi phí lớn nhất",
          "Chênh so với mục tiêu"
        ]
      },
      {
        "name": "Dự báo dòng tiền",
        "desc": "90 ngày tới",
        "kind": "Dự báo",
        "outline": [
          "Tiền vào",
          "Tiền ra",
          "Điểm thấp nhất cần chú ý"
        ]
      },
      {
        "name": "Quy tắc cảnh báo",
        "desc": "{alert}",
        "kind": "Quy tắc",
        "outline": [
          "Ngưỡng cảnh báo",
          "Cách nhận cảnh báo",
          "Việc cần làm khi có cảnh báo"
        ]
      },
      {
        "name": "Báo cáo mẫu",
        "desc": "Gửi cuối {cycle}",
        "kind": "Báo cáo",
        "outline": [
          "Số chính",
          "3 việc nên làm",
          "Ghi chú cho kỳ tới"
        ]
      }
    ]
  }
]
