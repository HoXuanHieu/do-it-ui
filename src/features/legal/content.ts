// Legal documents (Privacy Policy, Terms of Service). Too long for en.json keys, so each language is a full copy here.
// The Vietnamese text is authoritative. mobile/src/features/legal/content.ts is an identical copy: edit both.
// Template only, not legal advice: have a lawyer review before relying on it.

/** A paragraph, or a bullet list when it is an array. */
export type Block = string | string[]
export interface LegalDoc {
  title: string
  updated: string
  sections: { h: string; body: Block[] }[]
}

export const CONTACT_EMAIL = 'hxhieu123@gmail.com'
export const COPYRIGHT = '© 2026 DO-IT'

const PRIVACY_VI: LegalDoc = {
  title: 'Chính sách quyền riêng tư',
  updated: 'Cập nhật lần cuối: 26/11/2026',
  sections: [
    {
      h: '1. Giới thiệu',
      body: [
        'DO-IT ("chúng tôi") là ứng dụng quản lý cá nhân gồm lịch, tài chính, sức khỏe, mục tiêu và thông báo, trên web và di động. Chính sách này giải thích dữ liệu cá nhân nào chúng tôi xử lý, vì sao, lưu ở đâu và bạn có những quyền gì.',
        'Chúng tôi là bên kiểm soát và xử lý dữ liệu cá nhân của bạn và xử lý dữ liệu theo pháp luật Việt Nam, đặc biệt là Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.',
      ],
    },
    {
      h: '2. Dữ liệu chúng tôi thu thập',
      body: [
        'Bạn tự nhập toàn bộ dữ liệu dưới đây. Chúng tôi không mua dữ liệu từ nơi khác.',
        [
          'Tài khoản: email, mật khẩu (chỉ lưu dạng đã băm, chúng tôi không đọc được), họ tên, ngày sinh, giới tính, ảnh đại diện. Chỉ email và mật khẩu là bắt buộc.',
          'Tùy chọn: múi giờ, tiền tệ, định dạng ngày, giao diện, ngôn ngữ, cài đặt thông báo.',
          'Lịch: sự kiện (tiêu đề, mô tả, địa điểm, thời gian, trạng thái), ghi chú và nhắc nhở của sự kiện.',
          'Tài chính: giao dịch thu/chi (số tiền, tiền tệ, danh mục, ngày, mô tả, ghi chú), danh mục, ngân sách, hũ chi tiêu.',
          'Sức khỏe: hồ sơ sức khỏe (tên, ngày sinh, giới tính, chiều cao, cân nặng, cân nặng mục tiêu, mức vận động, mục tiêu, tình trạng sức khỏe như đau khớp, đau lưng, tim mạch/huyết áp, tiểu đường, ghi chú), số đo cơ thể, nhật ký ăn uống, buổi tập luyện.',
          'Mục tiêu: tiêu đề, mô tả, kế hoạch, các bước, kết quả, giờ nhắc.',
          'Thông báo: nội dung các thông báo và nhắc nhở chúng tôi gửi cho bạn.',
          'Dữ liệu kỹ thuật: địa chỉ IP, thông tin trình duyệt/thiết bị và thời điểm truy cập trong nhật ký máy chủ, dùng cho bảo mật và khắc phục lỗi.',
        ],
        'Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP. Chúng tôi bảo vệ cả dữ liệu sức khỏe và dữ liệu tài chính của bạn ở mức của dữ liệu nhạy cảm.',
      ],
    },
    {
      h: '3. Mục đích xử lý',
      body: [
        [
          'Cung cấp các tính năng của ứng dụng: lưu, hiển thị, tính toán (ví dụ: lượng calo, ngân sách, tiến độ mục tiêu).',
          'Gửi nhắc nhở và thông báo trong ứng dụng và qua email (nhắc sự kiện, tập luyện, mục tiêu, cảnh báo ngân sách, xác nhận email, đặt lại mật khẩu, cảnh báo bảo mật). Bạn có thể tắt thông báo email trong Cài đặt, trừ email bảo mật và tài khoản.',
          'Bảo vệ tài khoản và hệ thống: xác thực, giới hạn số lần thử, phát hiện lạm dụng.',
        ],
        'Chúng tôi không bán dữ liệu của bạn, không dùng dữ liệu để quảng cáo và không chia sẻ cho bên thứ ba vì mục đích tiếp thị.',
      ],
    },
    {
      h: '4. Cơ sở xử lý và sự đồng ý',
      body: [
        'Khi đăng ký tài khoản, bạn đồng ý cho chúng tôi xử lý dữ liệu theo Chính sách này, kể cả dữ liệu sức khỏe bạn chủ động nhập. Bạn có thể rút lại sự đồng ý bất cứ lúc nào bằng cách yêu cầu xóa tài khoản (mục 9). Việc rút lại không ảnh hưởng tới việc xử lý đã diễn ra trước đó.',
      ],
    },
    {
      h: '5. Nơi lưu trữ và bên thứ ba',
      body: [
        'Chúng tôi chỉ dùng các nhà cung cấp hạ tầng sau, và họ chỉ xử lý dữ liệu để vận hành dịch vụ cho chúng tôi:',
        [
          'Amazon Web Services (AWS), khu vực Sydney, Úc: máy chủ ứng dụng (EC2) và cơ sở dữ liệu (RDS PostgreSQL). Toàn bộ dữ liệu tài khoản và nội dung của bạn được lưu tại đây.',
          'Nhà cung cấp dịch vụ gửi email (SMTP): nhận địa chỉ email và nội dung từng email để chuyển tới bạn.',
          'GitHub Pages: lưu trữ giao diện web. Khi bạn mở trang web, GitHub có thể ghi nhận địa chỉ IP của bạn theo chính sách của họ.',
        ],
        'Vì máy chủ đặt tại Úc, dữ liệu của bạn được chuyển ra ngoài lãnh thổ Việt Nam. Chúng tôi thực hiện việc chuyển dữ liệu này theo các yêu cầu của Nghị định 13/2023/NĐ-CP, bao gồm việc lập hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài.',
        'Chúng tôi không dùng công cụ phân tích hành vi, quảng cáo hay theo dõi của bên thứ ba. Chúng tôi chỉ cung cấp dữ liệu cho cơ quan nhà nước khi pháp luật yêu cầu.',
      ],
    },
    {
      h: '6. Dữ liệu lưu trên thiết bị của bạn',
      body: [
        [
          'Web: một cookie httpOnly để duy trì đăng nhập; bộ nhớ trình duyệt (localStorage) lưu ngôn ngữ đã chọn và danh sách nhắc uống thuốc.',
          'Di động: bộ nhớ của ứng dụng lưu phiên đăng nhập, ngôn ngữ và danh sách nhắc uống thuốc.',
        ],
        'Danh sách nhắc uống thuốc chỉ nằm trên thiết bị của bạn, không được gửi lên máy chủ. Chúng tôi không dùng cookie quảng cáo hay cookie theo dõi.',
      ],
    },
    {
      h: '7. Bảo mật',
      body: [
        'Dữ liệu được truyền qua HTTPS. Mật khẩu được băm. Mỗi người dùng chỉ truy cập được dữ liệu của chính mình. Quyền truy cập máy chủ và cơ sở dữ liệu bị giới hạn.',
        'Không có hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố lộ lọt dữ liệu cá nhân, chúng tôi sẽ thông báo cho cơ quan có thẩm quyền và cho bạn theo thời hạn của pháp luật (không quá 72 giờ đối với thông báo tới cơ quan chức năng).',
      ],
    },
    {
      h: '8. Thời gian lưu trữ',
      body: [
        'Chúng tôi lưu dữ liệu trong thời gian tài khoản của bạn còn hoạt động. Mục bạn xóa có thể còn tạm thời trong hệ thống và trong bản sao lưu một thời gian ngắn trước khi bị xóa hẳn. Khi tài khoản bị xóa, dữ liệu sẽ bị xóa hoặc ẩn danh, trừ khi pháp luật buộc phải lưu lâu hơn.',
      ],
    },
    {
      h: '9. Quyền của bạn',
      body: [
        'Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:',
        [
          'Được biết về việc xử lý dữ liệu của mình, và đồng ý hoặc không đồng ý.',
          'Truy cập, xem, chỉnh sửa dữ liệu (phần lớn có thể làm ngay trong ứng dụng).',
          'Rút lại sự đồng ý; yêu cầu xóa dữ liệu hoặc xóa tài khoản.',
          'Yêu cầu hạn chế xử lý, phản đối xử lý, yêu cầu cung cấp bản sao dữ liệu.',
          'Khiếu nại, tố cáo, khởi kiện và yêu cầu bồi thường thiệt hại theo quy định của pháp luật.',
        ],
        'Để thực hiện các quyền này, hãy gửi email tới địa chỉ ở mục 12 bằng email bạn dùng để đăng ký. Chúng tôi sẽ xử lý yêu cầu trong thời hạn pháp luật quy định.',
      ],
    },
    {
      h: '10. Trẻ em',
      body: [
        'DO-IT không dành cho trẻ em. Người dưới 16 tuổi chỉ được sử dụng khi có sự đồng ý của cha mẹ hoặc người giám hộ. Nếu bạn biết trẻ em đã cung cấp dữ liệu mà không có sự đồng ý này, hãy liên hệ để chúng tôi xóa.',
      ],
    },
    {
      h: '11. Thay đổi chính sách',
      body: [
        'Chúng tôi có thể cập nhật Chính sách này. Ngày cập nhật được ghi ở đầu trang. Với thay đổi quan trọng, chúng tôi sẽ thông báo trong ứng dụng hoặc qua email trước khi áp dụng.',
      ],
    },
    { h: '12. Liên hệ', body: [`Mọi câu hỏi và yêu cầu về dữ liệu cá nhân, vui lòng gửi tới: ${CONTACT_EMAIL}`] },
  ],
}

const PRIVACY_EN: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'Last updated: 26 November 2026',
  sections: [
    {
      h: '1. Introduction',
      body: [
        'DO-IT ("we") is a personal organiser for calendar, finance, health, goals and notifications, on web and mobile. This policy explains what personal data we process, why, where it is stored and what rights you have.',
        'We are the controller and processor of your personal data and process it under Vietnamese law, in particular Decree 13/2023/ND-CP on personal data protection. The Vietnamese version of this policy prevails.',
      ],
    },
    {
      h: '2. Data we collect',
      body: [
        'You enter all of the data below yourself. We do not buy data from anyone.',
        [
          'Account: email, password (stored only as a hash we cannot read), full name, date of birth, gender, avatar. Only email and password are required.',
          'Preferences: time zone, currency, date format, theme, language, notification settings.',
          'Calendar: events (title, description, location, times, status), event notes and reminders.',
          'Finance: income/expense transactions (amount, currency, category, date, description, note), categories, budgets, spending jars.',
          'Health: health profiles (name, date of birth, sex, height, weight, target weight, activity level, goal, conditions such as joint pain, back pain, heart/blood pressure, diabetes, notes), body measurements, food log, workouts.',
          'Goals: title, description, plan, steps, results, reminder time.',
          'Notifications: the content of notifications and reminders we send you.',
          'Technical data: IP address, browser/device information and access times in server logs, used for security and troubleshooting.',
        ],
        'Health data is sensitive personal data under Decree 13/2023/ND-CP. We protect both your health and your finance data at the level of sensitive data.',
      ],
    },
    {
      h: '3. Why we process it',
      body: [
        [
          'To provide the app\'s features: storing, showing and calculating (for example calories, budgets, goal progress).',
          'To send in-app and email reminders and notifications (event, workout and goal reminders, budget alerts, email confirmation, password reset, security alerts). You can turn off email notifications in Settings, except security and account emails.',
          'To protect accounts and the system: authentication, rate limiting, abuse detection.',
        ],
        'We do not sell your data, do not use it for advertising and do not share it with third parties for marketing.',
      ],
    },
    {
      h: '4. Legal basis and consent',
      body: [
        'By creating an account you consent to us processing your data under this policy, including health data you choose to enter. You may withdraw consent at any time by asking us to delete your account (section 9). Withdrawal does not affect processing that took place before it.',
      ],
    },
    {
      h: '5. Storage location and third parties',
      body: [
        'We use only the following infrastructure providers, who process data solely to run the service for us:',
        [
          'Amazon Web Services (AWS), Sydney region, Australia: application server (EC2) and database (RDS PostgreSQL). All your account data and content are stored there.',
          'An email delivery (SMTP) provider: receives your email address and the content of each email in order to deliver it.',
          'GitHub Pages: hosts the web interface. When you open the website, GitHub may log your IP address under its own policy.',
        ],
        'Because the servers are in Australia, your data is transferred outside Vietnam. We carry out this transfer under the requirements of Decree 13/2023/ND-CP, including preparing an overseas data transfer impact assessment.',
        'We use no third-party analytics, advertising or tracking tools. We disclose data to authorities only when required by law.',
      ],
    },
    {
      h: '6. Data stored on your device',
      body: [
        [
          'Web: an httpOnly cookie to keep you signed in; browser storage (localStorage) for your chosen language and medication reminder list.',
          'Mobile: app storage for your sign-in session, language and medication reminder list.',
        ],
        'The medication reminder list stays on your device and is never sent to our servers. We use no advertising or tracking cookies.',
      ],
    },
    {
      h: '7. Security',
      body: [
        'Data is transmitted over HTTPS. Passwords are hashed. Each user can access only their own data. Access to servers and the database is restricted.',
        'No system is perfectly secure. If a personal data breach occurs, we will notify the competent authority and you within the time required by law (no later than 72 hours for notifying the authority).',
      ],
    },
    {
      h: '8. Retention',
      body: [
        'We keep your data while your account is active. Items you delete may remain briefly in the system and in backups before they are permanently removed. When your account is deleted, your data is deleted or anonymised unless the law requires us to keep it longer.',
      ],
    },
    {
      h: '9. Your rights',
      body: [
        'Under Decree 13/2023/ND-CP you have the right to:',
        [
          'Be informed about the processing of your data, and to consent or refuse.',
          'Access, view and correct your data (most of it directly in the app).',
          'Withdraw consent; request deletion of your data or account.',
          'Request restriction of processing, object to processing, and request a copy of your data.',
          'Complain, report, sue and claim damages as provided by law.',
        ],
        'To exercise these rights, email the address in section 12 from the email you registered with. We will handle your request within the time required by law.',
      ],
    },
    {
      h: '10. Children',
      body: [
        'DO-IT is not intended for children. People under 16 may use it only with the consent of a parent or guardian. If you learn that a child has provided data without such consent, contact us and we will delete it.',
      ],
    },
    {
      h: '11. Changes',
      body: [
        'We may update this policy. The date at the top shows the latest version. For significant changes we will notify you in the app or by email before they take effect.',
      ],
    },
    { h: '12. Contact', body: [`For any question or request about your personal data, email: ${CONTACT_EMAIL}`] },
  ],
}

const TERMS_VI: LegalDoc = {
  title: 'Điều khoản sử dụng',
  updated: 'Cập nhật lần cuối: 26/11/2026',
  sections: [
    {
      h: '1. Chấp nhận điều khoản',
      body: [
        'Điều khoản này là thỏa thuận giữa bạn và DO-IT ("chúng tôi") khi bạn sử dụng ứng dụng DO-IT trên web và di động ("Dịch vụ"). Bằng việc đăng ký hoặc sử dụng Dịch vụ, bạn đồng ý với Điều khoản này và Chính sách quyền riêng tư. Nếu không đồng ý, vui lòng không sử dụng Dịch vụ.',
      ],
    },
    {
      h: '2. Tài khoản',
      body: [
        [
          'Bạn cần từ đủ 16 tuổi, hoặc có sự đồng ý của cha mẹ/người giám hộ.',
          'Bạn cung cấp email đúng và thuộc quyền sử dụng của mình.',
          'Bạn tự bảo mật mật khẩu và chịu trách nhiệm cho mọi hoạt động trên tài khoản. Hãy báo ngay cho chúng tôi nếu nghi ngờ tài khoản bị truy cập trái phép.',
        ],
      ],
    },
    {
      h: '3. Sử dụng hợp lệ',
      body: [
        'Bạn đồng ý không:',
        [
          'Dùng Dịch vụ vào mục đích vi phạm pháp luật Việt Nam hoặc xâm phạm quyền của người khác.',
          'Truy cập trái phép, dò quét lỗ hổng, can thiệp hoặc làm quá tải hệ thống; vượt qua giới hạn kỹ thuật hay cơ chế bảo mật.',
          'Thu thập dữ liệu tự động, sao chép, bán lại hoặc khai thác thương mại Dịch vụ khi chưa được chúng tôi cho phép bằng văn bản.',
          'Tải lên nội dung chứa mã độc hoặc nội dung vi phạm pháp luật.',
        ],
      ],
    },
    {
      h: '4. Nội dung của bạn',
      body: [
        'Bạn giữ toàn quyền đối với dữ liệu bạn nhập (sự kiện, giao dịch, hồ sơ sức khỏe, mục tiêu, ảnh đại diện…). Bạn cho phép chúng tôi lưu trữ và xử lý dữ liệu đó chỉ để cung cấp Dịch vụ cho bạn, như mô tả trong Chính sách quyền riêng tư.',
      ],
    },
    {
      h: '5. Không phải tư vấn chuyên môn',
      body: [
        'Các con số, gợi ý và tính toán về sức khỏe, dinh dưỡng, tập luyện và tài chính trong DO-IT chỉ mang tính tham khảo. Chúng không phải là tư vấn y tế, dinh dưỡng, tài chính hay đầu tư. Hãy hỏi ý kiến bác sĩ hoặc chuyên gia trước khi đưa ra quyết định quan trọng.',
      ],
    },
    {
      h: '6. Gói dịch vụ',
      body: [
        'Một số tính năng có thể yêu cầu gói trả phí. Giá, quyền lợi và điều kiện hoàn tiền sẽ được hiển thị rõ trước khi bạn thanh toán.',
      ],
    },
    {
      h: '7. Sở hữu trí tuệ',
      body: [
        'Phần mềm, mã nguồn, giao diện, thiết kế, tên và biểu trưng DO-IT thuộc quyền sở hữu của DO-IT và được bảo hộ theo pháp luật về sở hữu trí tuệ. Chúng tôi cấp cho bạn quyền cá nhân, không độc quyền, không chuyển nhượng để sử dụng Dịch vụ. Bạn không được sao chép, sửa đổi, dịch ngược hay phân phối bất kỳ phần nào của Dịch vụ khi chưa được phép.',
      ],
    },
    {
      h: '8. Tính sẵn có của Dịch vụ',
      body: [
        'Dịch vụ được cung cấp theo hiện trạng. Chúng tôi cố gắng duy trì Dịch vụ ổn định nhưng không cam kết Dịch vụ luôn liên tục, không lỗi, hay nhắc nhở luôn được gửi đúng giờ. Chúng tôi có thể thay đổi, tạm ngừng hoặc ngừng một phần Dịch vụ, và sẽ báo trước trong phạm vi hợp lý. Bạn nên tự lưu giữ bản sao những thông tin quan trọng.',
      ],
    },
    {
      h: '9. Giới hạn trách nhiệm',
      body: [
        'Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm đối với thiệt hại gián tiếp, mất lợi nhuận hoặc mất dữ liệu phát sinh từ việc sử dụng hoặc không thể sử dụng Dịch vụ, hay từ quyết định bạn đưa ra dựa trên thông tin trong Dịch vụ. Điều này không loại trừ các quyền của người tiêu dùng mà pháp luật không cho phép loại trừ.',
      ],
    },
    {
      h: '10. Chấm dứt',
      body: [
        'Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản bất cứ lúc nào. Chúng tôi có thể tạm khóa hoặc chấm dứt tài khoản vi phạm Điều khoản này hoặc pháp luật. Khi tài khoản bị xóa, dữ liệu được xử lý theo Chính sách quyền riêng tư.',
      ],
    },
    {
      h: '11. Thay đổi điều khoản',
      body: [
        'Chúng tôi có thể cập nhật Điều khoản này. Với thay đổi quan trọng, chúng tôi sẽ thông báo trước trong ứng dụng hoặc qua email. Việc bạn tiếp tục sử dụng Dịch vụ sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận Điều khoản mới.',
      ],
    },
    {
      h: '12. Luật áp dụng và giải quyết tranh chấp',
      body: [
        'Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp trước hết được giải quyết bằng thương lượng; nếu không thành, một trong hai bên có thể đưa ra Tòa án có thẩm quyền tại Việt Nam.',
      ],
    },
    { h: '13. Liên hệ', body: [`Câu hỏi về Điều khoản này, vui lòng gửi tới: ${CONTACT_EMAIL}`] },
  ],
}

const TERMS_EN: LegalDoc = {
  title: 'Terms of Service',
  updated: 'Last updated: 26 November 2026',
  sections: [
    {
      h: '1. Acceptance',
      body: [
        'These terms are an agreement between you and DO-IT ("we") for your use of the DO-IT web and mobile apps (the "Service"). By signing up for or using the Service, you agree to these terms and the Privacy Policy. If you do not agree, do not use the Service. The Vietnamese version of these terms prevails.',
      ],
    },
    {
      h: '2. Accounts',
      body: [
        [
          'You must be at least 16, or have the consent of a parent or guardian.',
          'You provide a correct email address that you are entitled to use.',
          'You keep your password secure and are responsible for all activity on your account. Tell us at once if you suspect unauthorised access.',
        ],
      ],
    },
    {
      h: '3. Acceptable use',
      body: [
        'You agree not to:',
        [
          'Use the Service to break Vietnamese law or infringe the rights of others.',
          'Gain unauthorised access, scan for vulnerabilities, interfere with or overload the system, or bypass technical limits or security measures.',
          'Scrape, copy, resell or commercially exploit the Service without our written permission.',
          'Upload malware or unlawful content.',
        ],
      ],
    },
    {
      h: '4. Your content',
      body: [
        'You keep all rights to the data you enter (events, transactions, health profiles, goals, avatar…). You allow us to store and process it only to provide the Service to you, as described in the Privacy Policy.',
      ],
    },
    {
      h: '5. Not professional advice',
      body: [
        'Health, nutrition, workout and finance figures, suggestions and calculations in DO-IT are for reference only. They are not medical, nutritional, financial or investment advice. Consult a doctor or qualified professional before making important decisions.',
      ],
    },
    {
      h: '6. Plans',
      body: [
        'Some features may require a paid plan. Price, benefits and refund terms will be shown clearly before you pay.',
      ],
    },
    {
      h: '7. Intellectual property',
      body: [
        'The software, source code, interface, design, name and logo of DO-IT belong to DO-IT and are protected by intellectual property law. We grant you a personal, non-exclusive, non-transferable right to use the Service. You may not copy, modify, reverse engineer or distribute any part of the Service without permission.',
      ],
    },
    {
      h: '8. Availability',
      body: [
        'The Service is provided "as is". We try to keep it running reliably but do not promise it will be uninterrupted or error-free, or that reminders will always arrive on time. We may change, suspend or discontinue parts of the Service, with reasonable notice where possible. Keep your own copy of important information.',
      ],
    },
    {
      h: '9. Limitation of liability',
      body: [
        'To the extent permitted by law, we are not liable for indirect damages, lost profits or lost data arising from use of, or inability to use, the Service, or from decisions you make based on information in it. This does not exclude consumer rights that the law does not allow to be excluded.',
      ],
    },
    {
      h: '10. Termination',
      body: [
        'You may stop using the Service and ask us to delete your account at any time. We may suspend or terminate accounts that breach these terms or the law. When an account is deleted, its data is handled under the Privacy Policy.',
      ],
    },
    {
      h: '11. Changes',
      body: [
        'We may update these terms. For significant changes we will notify you in advance in the app or by email. Continuing to use the Service after a change takes effect means you accept the new terms.',
      ],
    },
    {
      h: '12. Governing law and disputes',
      body: [
        'These terms are governed by the law of Vietnam. Disputes will first be resolved by negotiation; failing that, either party may bring the dispute before a competent court in Vietnam.',
      ],
    },
    { h: '13. Contact', body: [`For questions about these terms, email: ${CONTACT_EMAIL}`] },
  ],
}

/** Vietnamese for 'vi', English for every other language. */
export const legalDoc = (doc: 'privacy' | 'terms', lang: string): LegalDoc =>
  doc === 'privacy' ? (lang === 'vi' ? PRIVACY_VI : PRIVACY_EN) : lang === 'vi' ? TERMS_VI : TERMS_EN
