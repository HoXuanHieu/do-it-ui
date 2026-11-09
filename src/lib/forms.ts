import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api'

/** Push ValidationProblemDetails field errors onto the form; returns a form-level message (or '' when mapped to fields). */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError?: UseFormSetError<T>): string {
  if (err instanceof ApiError) {
    if (err.problem.errors && setError) {
      for (const [field, messages] of Object.entries(err.problem.errors)) {
        setError(field as Path<T>, { message: translate(messages[0]) })
      }
      return ''
    }
    if (err.status === 401) return 'Email hoặc mật khẩu không đúng.'
    if (err.status === 423) return 'Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.'
    if (err.status === 429) return 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'
    if (err.problem.errors) return translate(Object.values(err.problem.errors)[0][0])
  }
  return 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Server messages are English (API contract); map the common ones for the Vietnamese UI.
const MESSAGES: Record<string, string> = {
  'Email is already registered.': 'Email đã được đăng ký.',
  'Current password is incorrect.': 'Mật khẩu hiện tại không đúng.',
  'The reset link is invalid or has expired.': 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  'Only JPEG, PNG or WebP images are allowed.': 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
  'Image must be between 1 byte and 2 MB.': 'Ảnh tối đa 2 MB.',
  'Date of birth must be between 1900 and today.': 'Ngày sinh phải từ năm 1900 đến hôm nay.',
  'New password must differ from the current password.': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  'Unknown time zone.': 'Múi giờ không hợp lệ.',
  'A category with this name already exists (it may be archived).': 'Đã có danh mục cùng tên (có thể đang được lưu trữ).',
  'Category not found.': 'Không tìm thấy danh mục.',
  'Category does not match the transaction type.': 'Danh mục không khớp với loại giao dịch.',
  'This category is archived.': 'Danh mục này đã được lưu trữ.',
  'Amount must be greater than zero.': 'Số tiền phải lớn hơn 0.',
  'Amount can have at most 2 decimal places.': 'Số tiền tối đa 2 chữ số thập phân.',
  'Date cannot be more than 1 year in the future.': 'Ngày không được quá 1 năm trong tương lai.',
  'Set a total limit or at least one category limit.': 'Nhập tổng hạn mức hoặc ít nhất một hạn mức danh mục.',
  'Every category must be one of your expense categories.': 'Danh mục phải là danh mục chi của bạn.',
  'Default categories cannot be deleted.': 'Không thể xóa danh mục mặc định.',
  'End time must be later than start time.': 'Thời gian kết thúc phải sau thời gian bắt đầu.',
}

function translate(message: string) {
  return MESSAGES[message] ?? message
}

/** Password rules shared by register / change / reset (SUP-AUTH-01). */
export const PASSWORD_HINT = 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số.'
