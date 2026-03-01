/**
 * Financial calculation utilities
 */

export const calculateExpectedAsset = (data: any, realReturnRate: number) => {
  const {
    currentAge,
    workIncome,
    sideIncome,
    investmentRate,
    retirementAge,
    largeExpenses,
    salaryGrowthRate,
    inflationRate,
  } = data;

  const yearsToRetirement = retirementAge - currentAge;
  const initialAnnualInvestment = (workIncome + sideIncome) * (investmentRate / 100) * 12;
  const nominalReturnRate = (realReturnRate + inflationRate) / 100;

  let fv = 0;
  let currentAnnualInv = initialAnnualInvestment;

  for (let year = 1; year <= yearsToRetirement; year++) {
    fv = fv * (1 + nominalReturnRate) + currentAnnualInv;
    currentAnnualInv *= (1 + salaryGrowthRate / 100);
    
    const expense = largeExpenses.find((e: any) => e.age === currentAge + year);
    if (expense) {
      fv -= expense.amount;
    }
  }

  return fv;
};

export const calculateStep1Results = (data: any) => {
  const {
    currentAge,
    workIncome,
    sideIncome,
    investmentRate,
    retirementAge,
    monthlyLivingExpense,
    largeExpenses,
    salaryGrowthRate,
    inflationRate,
  } = data;

  const currentAgeNum = Number(currentAge) || 0;
  const retirementAgeNum = Number(retirementAge) || 0;
  const monthlyLivingExpenseNum = Number(monthlyLivingExpense) || 0;
  const inflationRateNum = Number(inflationRate) || 0;
  const investmentRateNum = Number(investmentRate) || 0;
  const workIncomeNum = Number(workIncome) || 0;
  const sideIncomeNum = Number(sideIncome) || 0;
  const salaryGrowthRateNum = Number(salaryGrowthRate) || 0;

  const yearsToRetirement = Math.max(0, retirementAgeNum - currentAgeNum);
  const inflationFactor = Math.pow(1 + inflationRateNum / 100, yearsToRetirement);
  
  const futureMonthlyExpense = monthlyLivingExpenseNum * inflationFactor;
  // Assuming 4% withdrawal rule for target amount calculation
  const targetAmount = (futureMonthlyExpense * 12) / 0.04;

  const initialAnnualInvestment = (workIncomeNum + sideIncomeNum) * (investmentRateNum / 100) * 12;
  
  const findRequiredReturn = (target: number) => {
    if (yearsToRetirement <= 0) return 0;
    let low = -0.5;
    let high = 2.0;
    let r = 0.05;
    
    for (let i = 0; i < 100; i++) {
      r = (low + high) / 2;
      let fv = 0;
      let currentAnnualInv = initialAnnualInvestment;
      
      for (let year = 1; year <= yearsToRetirement; year++) {
        fv = fv * (1 + r) + currentAnnualInv;
        currentAnnualInv *= (1 + salaryGrowthRateNum / 100);
        
        const expense = largeExpenses.find((e: any) => e.age === currentAgeNum + year);
        if (expense) fv -= expense.amount;
      }
      
      if (fv < target) {
        low = r;
      } else {
        high = r;
      }
    }
    return r;
  };

  const nominalReturn = findRequiredReturn(targetAmount);
  const realReturn = nominalReturn - (inflationRateNum / 100);

  return {
    targetAmount: isNaN(targetAmount) ? 0 : targetAmount,
    nominalReturn: nominalReturn * 100,
    realReturn: realReturn * 100,
    futureMonthlyExpense: isNaN(futureMonthlyExpense) ? 0 : futureMonthlyExpense,
    inflationFactor: isNaN(inflationFactor) ? 1 : inflationFactor
  };
};

export const getAccountPriorities = (income: number, preference: string) => {
  // Logic for account priority based on Korean tax system
  // ISA, IRP/Pension, General
  const priorities = [];
  
  if (preference === 'C') { // Tax efficiency focus
    priorities.push({
      rank: 1,
      name: "ISA (개인종합자산관리계좌)",
      ratio: 50,
      description: "정부가 국민의 자산 형성을 돕기 위해 만든 '만능 절세 바구니'입니다.",
      reason: "비과세 및 분리과세 혜택이 가장 강력하며, 3년만 유지하면 일반 계좌보다 훨씬 많은 수익을 가져갈 수 있습니다.",
      usage: "연 2,000만원 한도로 납입하며, 국내 상장된 해외 지수 ETF(S&P500, 나스닥 등)를 담기에 최적입니다."
    });
    priorities.push({
      rank: 2,
      name: "연금저축펀드 / IRP",
      ratio: 30,
      description: "노후 준비와 연말정산 세액공제를 동시에 챙기는 '필수 노후 통장'입니다.",
      reason: "매년 최대 900만원까지 입금하면 연말정산 때 최대 148.5만원을 돌려받을 수 있어 시작부터 수익을 내고 들어가는 셈입니다.",
      usage: "세액공제 한도까지 우선 납입하고, 장기 우상향하는 지수 ETF에 적립식으로 투자하세요."
    });
    priorities.push({
      rank: 3,
      name: "일반 위탁계좌",
      ratio: 20,
      description: "제한 없이 자유롭게 입출금하고 모든 주식에 투자할 수 있는 '자유 통장'입니다.",
      reason: "절세 계좌의 한도를 모두 채운 후, 더 큰 금액을 굴리거나 개별 해외 주식에 직접 투자할 때 활용합니다.",
      usage: "해외 직구 주식(애플, 엔비디아 등)이나 절세 계좌에서 살 수 없는 종목 위주로 운용하세요."
    });
  } else if (preference === 'A') { // Direct US stocks
    priorities.push({
      rank: 1,
      name: "일반 위탁계좌 (해외주식)",
      ratio: 60,
      description: "미국 시장의 개별 우량주를 직접 소유할 수 있는 가장 기본적인 계좌입니다.",
      reason: "애플, 테슬라, 엔비디아 같은 기업을 직접 사고 싶다면 일반 계좌가 유일한 방법입니다. 양도세 250만원 공제를 활용하세요.",
      usage: "환전 수수료가 저렴한 증권사를 선택하고, 장기 보유할 우량주 위주로 포트폴리오를 구성하세요."
    });
    priorities.push({
      rank: 2,
      name: "ISA (중개형)",
      ratio: 30,
      description: "미국 주식을 직접 살 순 없지만, 미국 지수를 추종하는 국내 ETF로 절세하는 계좌입니다.",
      reason: "미국 주식 직접 투자와 병행하여, 지수 추종 부분은 ISA에서 운용해 세금을 획기적으로 줄일 수 있습니다.",
      usage: "국내 상장된 S&P500, 나스닥100 ETF를 담아 비과세 혜택을 극대화하세요."
    });
    priorities.push({
      rank: 3,
      name: "연금저축펀드",
      ratio: 10,
      description: "아주 먼 미래를 위한 노후 자금을 미국 지수에 묻어두는 계좌입니다.",
      reason: "세액공제 혜택을 받으며 미국 시장의 성장을 노후까지 길게 가져가는 전략입니다.",
      usage: "적은 금액이라도 꾸준히 미국 지수 ETF를 매수하여 복리 효과를 누리세요."
    });
  } else { // ETF focus
    priorities.push({
      rank: 1,
      name: "ISA (개인종합자산관리계좌)",
      ratio: 50,
      description: "ETF 투자자에게 가장 유리한 '절세 끝판왕' 계좌입니다.",
      reason: "ETF 매매 차익과 배당금에 대해 비과세 혜택을 주기 때문에, 지수 투자자에게 이보다 좋은 계좌는 없습니다.",
      usage: "국내 상장된 해외 지수 ETF와 고배당 ETF를 조합하여 절세 효과를 누리세요."
    });
    priorities.push({
      rank: 2,
      name: "연금저축펀드",
      ratio: 30,
      description: "ETF를 활용한 자산배분(주식+채권)에 가장 최적화된 계좌입니다.",
      reason: "과세이연 효과 덕분에 배당금을 재투자할 때 세금을 떼지 않아 복리 효과가 극대화됩니다.",
      usage: "주식형 ETF와 채권형 ETF를 일정 비율로 섞어 안정적인 포트폴리오를 만드세요."
    });
    priorities.push({
      rank: 3,
      name: "IRP (개인형 퇴직연금)",
      ratio: 20,
      description: "강제적으로 안전자산을 섞게 하여 내 돈을 지켜주는 '안전 장치' 계좌입니다.",
      reason: "법적으로 위험자산(주식 등) 비중을 70%로 제한하기 때문에, 하락장에서도 내 자산을 보호해줍니다.",
      usage: "나머지 30%는 예금이나 만기매칭형 채권 ETF를 담아 안정성을 확보하세요."
    });
  }
  
  return priorities;
};

export const getPortfolioAllocation = (q1: string, q2: string, maxLoss: number) => {
  // Simple risk score calculation
  let score = 0;
  score += parseInt(q1); // 1: Stable, 2: Neutral, 3: Aggressive
  score += parseInt(q2); // 1: Conservative, 2: Market, 3: Profit
  
  let type = "중립형";
  let allocation = [];
  let rules = "";
  let recommendationReason = "";

  if (score <= 2) {
    type = "안정추구형";
    allocation = [
      { name: "단기채권/현금성자산 (CMA, 파킹통장)", ratio: 50, desc: "원금 보호와 유동성 확보" },
      { name: "국내외 채권 ETF", ratio: 30, desc: "낮은 변동성으로 안정적 수익" },
      { name: "글로벌 지수 ETF (S&P500)", ratio: 20, desc: "최소한의 성장성 확보" }
    ];
    rules = "변동성을 최소화하는 것이 핵심입니다. 매달 정해진 금액을 기계적으로 나누어 담으세요.";
    recommendationReason = "원금 손실에 대한 거부감이 크고 안정적인 자산 관리를 선호하시기 때문에, 변동성이 낮은 채권과 현금성 자산 비중을 높여 심리적 안정감을 유지하면서 물가 상승률 이상의 수익을 추구하는 포트폴리오입니다.";
  } else if (score <= 4) {
    type = "위험중립형";
    allocation = [
      { name: "미국 S&P500 / 나스닥100 ETF", ratio: 50, desc: "시장 평균 수익률 추종" },
      { name: "선진국/신흥국 분산 ETF", ratio: 20, desc: "지역적 분산 투자" },
      { name: "국내외 채권 및 안전자산", ratio: 30, desc: "하락장 방어용" }
    ];
    rules = "시장 수익률을 따라가는 전략입니다. 하락장에서도 매수를 멈추지 않는 것이 가장 중요합니다.";
    recommendationReason = "적절한 위험을 감수하면서 시장 평균 수준의 수익을 기대하시기에, 전 세계 자본주의의 성장을 가장 잘 반영하는 미국 지수 ETF를 중심으로 구성했습니다. 채권을 섞어 하락장에서도 견딜 수 있는 밸런스를 맞췄습니다.";
  } else {
    type = "적극투자형";
    allocation = [
      { name: "미국 나스닥100 / 반도체 테마 ETF", ratio: 60, desc: "고성장 기술주 중심 투자" },
      { name: "미국 S&P500 ETF", ratio: 30, desc: "포트폴리오의 중심축" },
      { name: "금/원자재 또는 개별 성장주", ratio: 10, desc: "추가 수익 기회 창출" }
    ];
    rules = "높은 변동성을 견뎌야 합니다. '오히려 좋아'라는 마음가짐으로 하락 시 추가 매수 기회를 노리세요.";
    recommendationReason = "장기적인 자산 증식을 위해 높은 변동성을 기꺼이 감수할 준비가 되어 있으시므로, 혁신 기업들이 모인 나스닥과 반도체 섹터 비중을 높여 시장 초과 수익을 극대화하는 공격적인 포트폴리오를 추천합니다.";
  }

  return { type, allocation, rules, recommendationReason };
};

export const calculateEstimatedRetirementAge = (data: any, realReturnRate: number) => {
  const {
    currentAge,
    workIncome,
    sideIncome,
    investmentRate,
    monthlyLivingExpense,
    largeExpenses,
    salaryGrowthRate,
    inflationRate,
  } = data;

  const currentAgeNum = Number(currentAge) || 0;
  const monthlyLivingExpenseNum = Number(monthlyLivingExpense) || 0;
  const inflationRateNum = Number(inflationRate) || 0;
  const investmentRateNum = Number(investmentRate) || 0;
  const workIncomeNum = Number(workIncome) || 0;
  const sideIncomeNum = Number(sideIncome) || 0;
  const salaryGrowthRateNum = Number(salaryGrowthRate) || 0;

  const initialAnnualInvestment = (workIncomeNum + sideIncomeNum) * (investmentRateNum / 100) * 12;
  const nominalReturnRate = (realReturnRate + inflationRateNum) / 100;
  
  let fv = 0;
  let currentAnnualInv = initialAnnualInvestment;
  
  for (let year = 1; year <= 100; year++) {
    fv = fv * (1 + nominalReturnRate) + currentAnnualInv;
    currentAnnualInv *= (1 + salaryGrowthRateNum / 100);
    
    const expense = largeExpenses.find((e: any) => e.age === currentAgeNum + year);
    if (expense) fv -= expense.amount;
    
    const currentInflationFactor = Math.pow(1 + inflationRateNum / 100, year);
    const currentFutureMonthlyExpense = monthlyLivingExpenseNum * currentInflationFactor;
    const currentTargetAmount = (currentFutureMonthlyExpense * 12) / 0.04;
    
    if (fv >= currentTargetAmount) {
      return currentAgeNum + year;
    }
  }
  
  return null;
};
