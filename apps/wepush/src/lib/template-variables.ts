export interface TemplateVariable {
  name: string
  label: string
  desc: string
  source: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: 'date', label: '当前日期', desc: 'YYYY年MM月DD日', source: '内置' },
  {
    name: 'city',
    label: '城市',
    desc: '用户配置或天气接口',
    source: '天气API/用户',
  },
  { name: 'weather', label: '天气', desc: '当日天气状况', source: '基础天气' },
  {
    name: 'max_temperature',
    label: '最高温度',
    desc: '当日最高温度',
    source: '基础天气',
  },
  {
    name: 'min_temperature',
    label: '最低温度',
    desc: '当日最低温度',
    source: '基础天气',
  },
  {
    name: 'wind_direction',
    label: '风向',
    desc: '当日风向',
    source: '基础天气',
  },
  {
    name: 'wind_scale',
    label: '风力等级',
    desc: '当日风力',
    source: '基础天气',
  },
  {
    name: 'temperature',
    label: '实时温度',
    desc: '当前实时温度（℃）',
    source: '基础天气',
  },
  {
    name: 'humidity',
    label: '湿度',
    desc: '当前湿度（含 % 号）',
    source: '基础天气',
  },
  {
    name: 'pm25',
    label: 'PM2.5',
    desc: 'PM2.5 浓度',
    source: '基础天气',
  },
  {
    name: 'pm10',
    label: 'PM10',
    desc: 'PM10 浓度',
    source: '基础天气',
  },
  {
    name: 'air_quality',
    label: '空气质量',
    desc: '空气质量等级（优/良/轻度等）',
    source: '基础天气',
  },
  {
    name: 'aqi',
    label: '空气质量指数',
    desc: '当日 AQI 数值',
    source: '基础天气',
  },
  {
    name: 'sunrise',
    label: '日出时间',
    desc: '当日日出 HH:MM',
    source: '基础天气',
  },
  {
    name: 'sunset',
    label: '日落时间',
    desc: '当日日落 HH:MM',
    source: '基础天气',
  },
  {
    name: 'notice',
    label: '温馨提示',
    desc: '当日提示语（如紫外线/雨伞）',
    source: '基础天气',
  },
  {
    name: 'ganmao',
    label: '感冒提醒',
    desc: '呼吸/感冒人群提示',
    source: '基础天气',
  },
  {
    name: 'birthday_message',
    label: '生日/纪念日（最近）',
    desc: '最近 30 天内的下一条提醒',
    source: '用户配置',
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `birthday_${i}`,
    label: `纪念日 #${i + 1}`,
    desc: `按时间排序的第 ${i + 1} 条纪念日；越界为空`,
    source: '用户配置',
  })),
  {
    name: 'moment_copyrighting',
    label: '每日一言',
    desc: '随机一言文案',
    source: 'Hitokoto',
  },
  {
    name: 'english_note',
    label: '每日一句(英)',
    desc: '金山词霸每日一句',
    source: 'iCIBA',
  },
  {
    name: 'chinese_note',
    label: '每日一句(中)',
    desc: '金山词霸每日一句翻译',
    source: 'iCIBA',
  },
]
