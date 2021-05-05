import * as dayjs from 'dayjs'

export const compareDate = (d1: Date, d2: Date) =>
  dayjs(d1).format('YYYY-MM-DDTHH:mm') === dayjs(d2).format('YYYY-MM-DDTHH:mm')
