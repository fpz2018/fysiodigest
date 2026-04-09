export const CATEGORIEEN = [
  { key: 'richtlijnen',  label: 'Richtlijnen' },
  { key: 'regelgeving',  label: 'Regelgeving' },
  { key: 'wetenschap',   label: 'Wetenschap' },
  { key: 'vakbladen',    label: 'Vakbladen' },
  { key: 'verzekeraars', label: 'Verzekeraars' },
  { key: 'opleidingen',  label: 'Opleidingen' },
  { key: 'ondernemen',   label: 'Ondernemen' },
  { key: 'subsidies',    label: 'Subsidies' },
  { key: 'overig',       label: 'Overig' },
]

export const DEFAULT_VOORKEUREN = {
  richtlijnen:  { belang: 'hoog',   drempel: 'geel' },
  regelgeving:  { belang: 'middel', drempel: 'rood' },
  wetenschap:   { belang: 'hoog',   drempel: 'geel' },
  vakbladen:    { belang: 'hoog',   drempel: 'grijs' },
  verzekeraars: { belang: 'middel', drempel: 'rood' },
  opleidingen:  { belang: 'middel', drempel: 'geel' },
  ondernemen:   { belang: 'laag',   drempel: 'rood' },
  subsidies:    { belang: 'laag',   drempel: 'rood' },
  overig:       { belang: 'laag',   drempel: 'grijs' },
}

export const BELANG_OPTIES = [
  { value: 'laag',   label: 'Laag',   dots: '●○○' },
  { value: 'middel', label: 'Middel', dots: '●●○' },
  { value: 'hoog',   label: 'Hoog',   dots: '●●●' },
]

export const DREMPEL_OPTIES = [
  { value: 'rood',  label: 'Alleen actie vereist' },
  { value: 'geel',  label: 'Relevant en hoger' },
  { value: 'grijs', label: 'Alles' },
]
