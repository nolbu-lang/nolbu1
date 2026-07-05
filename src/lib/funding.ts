/** 검토내용 텍스트에서 국비·시비 금액 쌍을 추출한다. (경상사업용) */
function parseFundingPair(text: string): { 국: number; 시: number } | null {
  const t = text.replace(/\s+/g, ' ')

  // (국 64,588  시58,988) / (국비 64,588 시비 58,988)
  const 국First =
    t.match(/[(\（]\s*국(?:비)?\s*([\d,]+)\s*시(?:비)?\s*([\d,]+)/) ??
    t.match(/국(?:비)?\s*([\d,]+)\s*시(?:비)?\s*([\d,]+)/)
  if (국First) {
    return {
      국: parseInt(국First[1].replace(/,/g, ''), 10),
      시: parseInt(국First[2].replace(/,/g, ''), 10),
    }
  }

  // (시비 100, 국비 80) / 시비 9 국비 9
  const 시First = t.match(/[(\（]?\s*시(?:비)?\s*([\d,]+)[,，\s]+국(?:비)?\s*([\d,]+)/)
  if (시First) {
    return {
      시: parseInt(시First[1].replace(/,/g, ''), 10),
      국: parseInt(시First[2].replace(/,/g, ''), 10),
    }
  }

  return null
}

/** 추출값을 백만원 단위로 맞춘다. (천원 표기 vs 백만원 표기 자동 판별) */
function toBaekmanPair(
  국: number,
  시: number,
  totalBaekman: number | null,
): { 국비: number; 시비: number } {
  const asIs = { 국비: 국, 시비: 시 }
  const fromCheon = { 국비: Math.round(국 / 1000), 시비: Math.round(시 / 1000) }

  if (totalBaekman == null || totalBaekman === 0) {
    return 국 + 시 > 5000 ? fromCheon : asIs
  }

  const diffAsIs = Math.abs(국 + 시 - totalBaekman)
  const diffCheon = Math.abs((국 + 시) / 1000 - totalBaekman)
  const tolerance = Math.max(totalBaekman * 0.2, 3)

  if (diffAsIs <= tolerance) return asIs
  if (diffCheon <= tolerance) return fromCheon
  return 국 + 시 > totalBaekman * 20 ? fromCheon : asIs
}

export interface ExtractedFunding {
  요구_국비: number | null
  요구_시비: number | null
  조정_국비: number | null
  조정_시비: number | null
  재원내역: boolean
}

/**
 * 경상사업 검토내용에서 국비·시비를 추출한다.
 * 투자사업처럼 재원별 행이 없고, 검토내용 텍스트에만 있는 경우가 많다.
 */
export function extractFundingFromReview(
  reviewText: string,
  요구액: number | null,
  조정액: number | null,
): ExtractedFunding {
  const empty: ExtractedFunding = {
    요구_국비: null,
    요구_시비: null,
    조정_국비: null,
    조정_시비: null,
    재원내역: false,
  }

  if (!reviewText.trim()) return empty

  const lines = reviewText.split('\n')
  let reqPair: { 국: number; 시: number } | null = null
  let adjPair: { 국: number; 시: number } | null = null
  let fallbackPair: { 국: number; 시: number } | null = null

  for (const line of lines) {
    const pair = parseFundingPair(line)
    if (!pair) continue

    if (/요구\s*내용|요구내용/.test(line)) {
      reqPair = pair
    } else if (/조정|반영/.test(line) && /국|시/.test(line)) {
      adjPair = pair
    } else if (!fallbackPair) {
      fallbackPair = pair
    }
  }

  const source = reqPair ?? fallbackPair
  if (!source) return empty

  const reqNorm = toBaekmanPair(source.국, source.시, 요구액)
  let adjNorm = reqNorm
  if (adjPair) {
    adjNorm = toBaekmanPair(adjPair.국, adjPair.시, 조정액)
  }

  return {
    요구_국비: reqNorm.국비,
    요구_시비: reqNorm.시비,
    조정_국비: adjPair ? adjNorm.국비 : null,
    조정_시비: adjPair ? adjNorm.시비 : null,
    재원내역: true,
  }
}
