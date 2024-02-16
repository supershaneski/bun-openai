
const STORE_KEY = 'bun/openai/message/items'

export function getStoredMessages() {

  const raw = localStorage.getItem(STORE_KEY)
  if(raw) {

    try {
      const items = JSON.parse(raw)
      return items
    } catch(error) {
      console.log(error.message)
    }

  }

  return []

}

export function storeMessages(data) {

  localStorage.setItem(STORE_KEY, JSON.stringify(data))
      
}

function formatNumber(n) {
  return String(n).padStart(2, '0')
}

function getMonthName(month) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]
}

export function getDatetime(stime) {

  const now = new Date()

  let now_year = now.getFullYear()
  let now_month = now.getMonth()
  let now_date = now.getDate()
  //now_month = formatNumber(now_month)
  now_date = formatNumber(now_date)

  const odate = new Date(stime)
  
  let syear = odate.getFullYear()
  let smonth = odate.getMonth()
  let sdate = odate.getDate()
  //smonth = formatNumber(smonth)
  sdate = formatNumber(sdate)

  let shour = odate.getHours()
  let sminute = odate.getMinutes()

  shour = formatNumber(shour)
  sminute = formatNumber(sminute)

  const month = getMonthName(smonth)

  if(now_year !== syear) {
    return `${month} ${sdate}, ${syear}`
  } else {
    if(now_month !== smonth) {
      return `${month} ${sdate}`
    } else {
      if(now_date !== sdate) {
        return [`${month} ${sdate}`,[shour, sminute].join(':')].join(' ')
      } else {
        return [shour, sminute].join(':')
      }
    }
  }
  
}