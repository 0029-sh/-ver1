import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calculator, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  Info,
  ArrowRight,
  RefreshCcw,
  Check
} from 'lucide-react';
import { INITIAL_STATE, AppState, Step1Data, Step2Data, Step3Data } from './types';
import { calculateStep1Results, getAccountPriorities, getPortfolioAllocation, calculateExpectedAsset, calculateEstimatedRetirementAge } from './utils';

const formatCurrency = (val: number) => {
  if (val === 0) return '0원';
  if (isNaN(val) || val === undefined || val === null) return '계산 중...';
  
  const absVal = Math.abs(val);
  const eok = Math.floor(absVal / 10000);
  const man = Math.round(absVal % 10000);
  
  let result = '';
  if (eok > 0) result += `${eok}억 `;
  if (man > 0 || (eok === 0 && man > 0)) result += `${man.toLocaleString()}만원`;
  if (eok === 0 && man === 0) return '0원';
  
  return (val < 0 ? '-' : '') + result.trim();
};

const formatKoreanCurrency = (val: number) => {
  const eok = Math.floor(val / 10000);
  const man = Math.round(val % 10000);
  return `${eok}억 ${man.toLocaleString()}만원`;
};

const NumericInput = ({ value, onChange, className, placeholder, onFocus, step = "any" }: any) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const lastSentValue = useRef(value);

  useEffect(() => {
    if (value !== lastSentValue.current) {
      setLocalValue(value.toString());
      lastSentValue.current = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      lastSentValue.current = parsed;
      onChange(parsed);
    } else if (val === '') {
      lastSentValue.current = 0;
      onChange(0);
    }
  };

  return (
    <input
      type="number"
      step={step}
      className={className}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      onFocus={onFocus}
    />
  );
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [step1SimReturn, setStep1SimReturn] = useState(0);

  const step1Results = useMemo(() => calculateStep1Results(state.step1), [state.step1]);

  useEffect(() => {
    if (state.currentStep === 1 && state.showResult) {
      setStep1SimReturn(Math.round(step1Results.realReturn * 10) / 10);
    }
  }, [step1Results.realReturn, state.currentStep, state.showResult]);

  const step1ExpectedAsset = useMemo(() => {
    return calculateExpectedAsset(state.step1, step1SimReturn);
  }, [state.step1, step1SimReturn]);

  const estimatedRetirementAgeStep1 = useMemo(() => {
    return calculateEstimatedRetirementAge(state.step1, step1SimReturn);
  }, [state.step1, step1SimReturn]);

  const step2Results = useMemo(() => getAccountPriorities(state.step1.workIncome, state.step2.investmentPreference), [state.step1.workIncome, state.step2.investmentPreference]);
  const step3Results = useMemo(() => getPortfolioAllocation(state.step3.q1, state.step3.q2, state.step3.q3), [state.step3.q1, state.step3.q2, state.step3.q3]);

  // For Step 4 simulation
  const [simRealReturn, setSimRealReturn] = useState(step1Results.realReturn);
  
  useEffect(() => {
    setSimRealReturn(step1Results.realReturn);
  }, [step1Results.realReturn]);

  const estimatedRetirementAgeStep4 = useMemo(() => {
    return calculateEstimatedRetirementAge(state.step1, simRealReturn);
  }, [state.step1, simRealReturn]);

  const simResults = useMemo(() => {
    const nominal = simRealReturn + (state.step1.inflationRate);
    
    // Calculate expected FV based on simRealReturn
    const yearsToRetirement = state.step1.retirementAge - state.step1.currentAge;
    const initialAnnualInvestment = (state.step1.workIncome + state.step1.sideIncome) * (state.step1.investmentRate / 100) * 12;
    
    let expectedFv = 0;
    let currentAnnualInv = initialAnnualInvestment;
    const r = (simRealReturn + state.step1.inflationRate) / 100;
    
    for (let year = 1; year <= yearsToRetirement; year++) {
      expectedFv = expectedFv * (1 + r) + currentAnnualInv;
      currentAnnualInv *= (1 + state.step1.salaryGrowthRate / 100);
      const expense = state.step1.largeExpenses.find((e: any) => e.age === state.step1.currentAge + year);
      if (expense) expectedFv -= expense.amount;
    }

    return {
      nominal,
      expectedFv,
      isAchievable: expectedFv >= step1Results.targetAmount
    };
  }, [simRealReturn, step1Results.targetAmount, state.step1]);

  const handleNext = () => {
    if (state.showResult) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1, showResult: false }));
    } else {
      setState(prev => ({ ...prev, showResult: true }));
    }
  };

  const handleBack = () => {
    if (state.showResult) {
      setState(prev => ({ ...prev, showResult: false }));
    } else {
      setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1), showResult: true }));
    }
  };

  const updateStep1 = (updates: Partial<Step1Data>) => {
    setState(prev => ({ ...prev, step1: { ...prev.step1, ...updates } }));
  };

  const updateStep2 = (updates: Partial<Step2Data>) => {
    setState(prev => ({ ...prev, step2: { ...prev.step2, ...updates } }));
  };

  const updateStep3 = (updates: Partial<Step3Data>) => {
    setState(prev => ({ ...prev, step3: { ...prev.step3, ...updates } }));
  };

  const addLargeExpense = () => {
    updateStep1({ largeExpenses: [...state.step1.largeExpenses, { age: 40, amount: 10000 }] });
  };

  const updateLargeExpense = (index: number, data: Partial<{ age: number; amount: number }>) => {
    const newExpenses = [...state.step1.largeExpenses];
    newExpenses[index] = { ...newExpenses[index], ...data };
    updateStep1({ largeExpenses: newExpenses });
  };

  const removeLargeExpense = (index: number) => {
    const newExpenses = [...state.step1.largeExpenses];
    newExpenses.splice(index, 1);
    updateStep1({ largeExpenses: newExpenses });
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-google-text">은퇴 후 내가 원하는 삶, 숫자로 먼저 그려볼까요?</h2>
        <p className="text-zinc-500">지금 소득과 목표를 알려주세요. 매달 얼마를 모아야 꿈꾸던 여유를 누릴 수 있을지 딱 계산해 드릴게요.</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="input-group">
            <label className="label">현재 나이</label>
            <NumericInput 
              className="input" 
              value={state.step1.currentAge} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ currentAge: num })}
            />
          </div>
          <div className="input-group">
            <label className="label">은퇴 희망 나이</label>
            <NumericInput 
              className="input" 
              value={state.step1.retirementAge} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ retirementAge: num })}
            />
          </div>
          <div className="input-group">
            <label className="label">월 근로 소득 (만원)</label>
            <NumericInput 
              className="input" 
              value={state.step1.workIncome} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ workIncome: num })}
            />
            <p className="text-[10px] text-zinc-400 font-medium">{formatKoreanCurrency(state.step1.workIncome)}</p>
          </div>
          <div className="input-group">
            <label className="label">월 부수입 (만원)</label>
            <NumericInput 
              className="input" 
              value={state.step1.sideIncome} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ sideIncome: num })}
            />
            <p className="text-[10px] text-zinc-400 font-medium">{formatKoreanCurrency(state.step1.sideIncome)}</p>
          </div>
          <div className="input-group">
            <label className="label">소득 대비 투자 비중 (%)</label>
            <input 
              type="range" 
              min="0" max="100" step="5"
              className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-brand" 
              value={state.step1.investmentRate} 
              onChange={e => updateStep1({ investmentRate: parseInt(e.target.value) || 0 })}
            />
            <div className="flex justify-between text-xs font-bold text-zinc-400">
              <span>0%</span>
              <span className="text-brand">{state.step1.investmentRate}%</span>
              <span>100%</span>
            </div>
          </div>
          <div className="input-group">
            <label className="label">은퇴 후 월 생활비 (현재 가치, 만원)</label>
            <NumericInput 
              className="input" 
              value={state.step1.monthlyLivingExpense} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ monthlyLivingExpense: num })}
            />
            <p className="text-[10px] text-zinc-400 font-medium">{formatKoreanCurrency(state.step1.monthlyLivingExpense)}</p>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-100 space-y-4">
          <label className="label text-zinc-600">목돈 지출 계획 (주택 마련, 결혼 등)</label>
          
          <div className="space-y-3">
            {state.step1.largeExpenses.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-zinc-100 rounded-2xl">
                <p className="text-xs text-zinc-400 font-medium">등록된 목돈 지출 계획이 없습니다.</p>
              </div>
            )}
            {state.step1.largeExpenses.map((exp, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">지출 계획 #{i + 1}</span>
                  <button 
                    onClick={() => removeLargeExpense(i)} 
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">지출 희망 나이</label>
                    <NumericInput 
                      className="input bg-white" 
                      value={exp.age} 
                      onFocus={(e: any) => e.target.select()}
                      onChange={(num: number) => updateLargeExpense(i, { age: num })}
                    />
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">예상 금액 (만원)</label>
                    <NumericInput 
                      className="input bg-white" 
                      value={exp.amount} 
                      onFocus={(e: any) => e.target.select()}
                      onChange={(num: number) => updateLargeExpense(i, { amount: num })}
                    />
                    <p className="text-[10px] text-zinc-400 font-medium mt-1">{formatKoreanCurrency(exp.amount)}</p>
                  </div>
                  <button className="h-[46px] px-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 font-bold text-sm whitespace-nowrap">
                    <Check size={18} />
                    확인
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <button 
            onClick={addLargeExpense}
            className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition-all flex items-center justify-center gap-2 font-bold text-sm"
          >
            <Plus size={18} />
            + 지출 계획 추가하기
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
          <div className="input-group">
            <label className="label">예상 연봉 상승률 (%)</label>
            <NumericInput 
              className="input" 
              value={state.step1.salaryGrowthRate} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ salaryGrowthRate: num })}
            />
          </div>
          <div className="input-group">
            <label className="label">예상 물가 상승률 (%)</label>
            <NumericInput 
              className="input" 
              value={state.step1.inflationRate} 
              onFocus={(e: any) => e.target.select()}
              onChange={(num: number) => updateStep1({ inflationRate: num })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep1Result = () => {
    const isAchieved = step1ExpectedAsset >= step1Results.targetAmount;
    const achievementRate = Math.min(100, (step1ExpectedAsset / step1Results.targetAmount) * 100);

    return (
      <div className="space-y-6">
        <div className="result-banner">
          <div className="inline-flex p-3 bg-white/20 text-white rounded-full mb-4">
            <Calculator size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">원하는 미래를 위해 매년 이만큼의 수익이 꼭 필요해요</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6 bg-white border-google-gray">
            <p className="text-zinc-500 text-sm mb-2">최종 은퇴 자금 목표액 (물가반영)</p>
            <p className="text-3xl font-bold mb-4 text-point">{formatCurrency(step1Results.targetAmount)}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {state.step1.currentAge}세의 {formatCurrency(state.step1.monthlyLivingExpense)}은 {state.step1.retirementAge}세에 {formatCurrency(step1Results.futureMonthlyExpense)}의 가치를 가집니다.
            </p>
          </div>

          <div className={`card p-6 border-2 transition-colors ${isAchieved ? 'border-emerald-500 bg-emerald-50' : 'border-google-gray bg-white'}`}>
            <p className="text-zinc-500 text-sm mb-2">예상 자산 (지출 제외 후)</p>
            <p className={`text-3xl font-bold mb-4 ${isAchieved ? 'text-emerald-600' : 'text-google-text'}`}>
              {formatCurrency(step1ExpectedAsset)}
            </p>
            <div className="flex items-center gap-2">
              {isAchieved ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  목표 달성 성공 🎉
                </span>
              ) : (
                <span className="text-zinc-400 font-bold">목표 달성 부족</span>
              )}
            </div>
          </div>
        </div>

        <div className="card p-6 bg-white border-google-gray space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">목표 연수익률 (실질)</p>
              <p className="text-4xl font-black text-google-text">{step1SimReturn.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">예상 은퇴 시점</p>
              <p className="text-2xl font-bold text-point">
                {estimatedRetirementAgeStep1 ? `${estimatedRetirementAgeStep1}세` : '목표 달성 불가'}
              </p>
              {estimatedRetirementAgeStep1 && (
                <p className="text-[10px] text-zinc-400 mt-1">지금으로부터 {estimatedRetirementAgeStep1 - state.step1.currentAge}년 후</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <input 
              type="range" 
              min="0" max="15" step="0.1"
              className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-brand" 
              value={step1SimReturn} 
              onChange={e => setStep1SimReturn(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span>보수적 (0%)</span>
              <span>공격적 (15%)</span>
            </div>
          </div>
        </div>

        <div className="bg-brand/5 p-6 rounded-2xl border border-brand/10 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-brand/10 rounded-lg">
              <TrendingUp className="text-brand" size={20} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-google-text">
                사용자님이 원하는 삶을 위해 연 <span className="text-point">{step1Results.realReturn.toFixed(1)}%</span>의 수익률이 꼭 필요해요!
              </p>
              <p className="text-sm text-zinc-500 leading-relaxed">
                "막막해 보이지만 걱정 마세요. 세금을 아껴주는 '통장'만 잘 활용해도 목표 달성이 훨씬 쉬워지거든요. 나에게 딱 맞는 통장 순서, 같이 알아볼까요?"
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-google-text">세금은 아끼고 수익은 키우는 '황금 계좌' 순서를 정해드려요</h2>
        <p className="text-zinc-500">복잡한 세금 혜택 비교는 저희가 할게요. 사용자님 상황에서 가장 돈을 많이 아껴주는 계좌부터 추천해 드릴게요.</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-wider">입력 정보 확인</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-xs text-zinc-500 mb-1">월 소득</p>
              <p className="font-bold text-google-text">{formatCurrency(state.step1.workIncome + state.step1.sideIncome)}</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-xs text-zinc-500 mb-1">목돈 지출 계획</p>
              {state.step1.largeExpenses.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {state.step1.largeExpenses.map((exp, i) => (
                    <p key={i} className="text-xs font-medium text-zinc-400">
                      • {exp.age}세: {formatCurrency(exp.amount)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="font-bold text-google-text">없음</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="label">어디에 투자하고 싶으신가요?</label>
          <div className="space-y-3">
            {[
              { id: 'A', title: '개별 미국 주식 직접 투자', desc: '애플, 테슬라처럼 유명한 주식을 직접 사고 싶어요.' },
              { id: 'B', title: '안전한 지수(ETF) 투자', desc: '개별 종목은 복잡해요. 시장 전체에 분산 투자하고 싶어요.' },
              { id: 'C', title: '최대한의 절세 혜택', desc: '아직 잘 모르겠어요. 세금을 가장 많이 아끼는 방법이 궁금해요.' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => updateStep2({ investmentPreference: opt.id as any })}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  state.step2.investmentPreference === opt.id 
                  ? 'border-brand bg-brand/5 shadow-sm' 
                  : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold ${state.step2.investmentPreference === opt.id ? 'text-brand' : 'text-google-text'}`}>{opt.title}</span>
                  {state.step2.investmentPreference === opt.id && <CheckCircle2 size={18} className="text-brand" />}
                </div>
                <p className="text-xs text-zinc-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2Result = () => (
    <div className="space-y-6">
      <div className="result-banner">
        <div className="inline-flex p-3 bg-white/20 text-white rounded-full mb-4">
          <Wallet size={32} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">계좌를 이렇게 나누기만 해도 세금으로 나갈 돈을 이만큼 아껴요</h2>
      </div>

      <div className="space-y-4">
        {step2Results.map((acc, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={acc.rank} 
            className="card p-6 space-y-4 border-google-gray"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white font-black text-sm shadow-lg shadow-brand/20">
                  {acc.rank}
                </span>
                <h3 className="text-lg font-bold text-google-text">{acc.name}</h3>
              </div>
              <span className="px-3 py-1 bg-point/10 text-point rounded-full text-xs font-black">비중 {acc.ratio}%</span>
            </div>
            <div className="space-y-4">
              <p className="text-zinc-500 text-sm font-medium italic">"{acc.description}"</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">추천 이유</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">{acc.reason}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">활용 방법</p>
                  <p className="text-brand text-sm font-bold">{acc.usage}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-google-text">이제 사용자님만의 맞춤 투자 지도를 만들어 드릴게요.</h2>
        <p className="text-zinc-500">매달 고민 없이 기계적으로 투자할 수 있게, 어떤 상품에 몇 퍼센트씩 담으면 좋을지 구체적으로 알려드려요.</p>
      </div>

      <div className="card p-6 space-y-8">
        <div className="space-y-4">
          <label className="label">Q1. 투자한 1억원이 한 달 만에 8,000만원(-20%)이 되었다면?</label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: '1', desc: '너무 무서워요. 더 잃기 전에 지금이라도 다 팔고 나올래요.' },
              { id: '2', desc: '속은 쓰리지만, 언젠가 오를 테니 그냥 참고 기다릴게요.' },
              { id: '3', desc: '오히려 좋아! 싸게 살 기회니까 돈을 더 끌어와서 추가로 살래요.' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => updateStep3({ q1: opt.id as any })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  state.step3.q1 === opt.id 
                  ? 'border-brand bg-brand/5 shadow-sm' 
                  : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className={`text-sm font-medium ${state.step3.q1 === opt.id ? 'text-brand font-bold' : 'text-zinc-500'}`}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="label">Q2. 수익률에 대한 나의 기대치는?</label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: '1', desc: '원금만은 절대 지키면서, 은행 이자보다 조금만 더 높으면 만족해요.' },
              { id: '2', desc: '시장 평균만큼만 따라가고 싶어요. 남들만큼만 벌면 좋겠어요.' },
              { id: '3', desc: '위험하더라도 시장보다 훨씬 높은 수익을 내서 빠르게 자산을 불리고 싶어요.' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => updateStep3({ q2: opt.id as any })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  state.step3.q2 === opt.id 
                  ? 'border-brand bg-brand/5 shadow-sm' 
                  : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className={`text-sm font-medium ${state.step3.q2 === opt.id ? 'text-brand font-bold' : 'text-zinc-500'}`}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="label">Q3. 나의 투자금 중 최대 얼마까지 잃어도 일상생활이 가능한가요? (만원)</label>
          <NumericInput 
            className="input" 
            value={state.step3.q3} 
            onFocus={(e: any) => e.target.select()}
            onChange={(num: number) => updateStep3({ q3: num })}
          />
          <p className="text-[10px] text-zinc-400 font-medium">{formatKoreanCurrency(state.step3.q3)}</p>
        </div>
      </div>
    </div>
  );

  const renderStep3Result = () => (
    <div className="space-y-6">
      <div className="result-banner">
        <div className="inline-flex p-3 bg-white/20 text-white rounded-full mb-4">
          <TrendingUp size={32} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">매달 고민 없이 딱 이 비중대로만 기계적으로 투자해 보세요</h2>
        <p className="text-sm font-bold text-white/80 mt-2">사용자님은 [{step3Results.type}]입니다</p>
      </div>

      <div className="card p-6 space-y-8 border-google-gray">
        <div className="space-y-6">
          {step3Results.allocation.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-zinc-500">{item.name}</span>
                <span className="text-lg font-black text-brand">{item.ratio}%</span>
              </div>
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.ratio}%` }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                  className="h-full bg-brand shadow-sm"
                />
              </div>
              <p className="text-xs text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-zinc-100 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">추천 이유</p>
            <p className="text-sm text-zinc-600 leading-relaxed">{step3Results.recommendationReason}</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">기계적인 투자 원칙</p>
            <p className="text-sm text-brand leading-relaxed italic font-bold">
              "{step3Results.rules} 매달 월급날(예: 25일)에 위 비중대로 '시장가' 매수하는 것을 원칙으로 하세요."
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8">
      <div className="result-banner">
        <div className="inline-flex p-3 bg-white/20 text-white rounded-full mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">축하합니다! 사용자님만의 투자 지도가 완성되었습니다</h2>
        <p className="text-sm text-white/80 mt-2">지금까지 설계한 모든 내용을 한눈에 확인하고 시뮬레이션 해보세요.</p>
      </div>

      {/* Simulation Section */}
      <div className="card p-6 bg-white space-y-6 border-google-gray">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold mb-1 text-google-text">수익률 시뮬레이션</h3>
            <p className="text-zinc-500 text-xs">실질 수익률을 조정하여 목표 달성 가능성을 확인하세요.</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${simResults.isAchievable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {simResults.isAchievable ? '목표 달성 가능' : '목표 달성 부족'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-sm text-zinc-500">설정 실질 수익률</span>
            <span className="text-3xl font-black text-brand">{simRealReturn.toFixed(1)}%</span>
          </div>
          <input 
            type="range" 
            min="-2" max="15" step="0.1"
            className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-brand" 
            value={simRealReturn} 
            onChange={e => setSimRealReturn(parseFloat(e.target.value))}
          />
          <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <span>보수적 (-2%)</span>
            <span>공격적 (15%)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
          <div>
            <p className="text-zinc-500 text-xs mb-1">예상 은퇴 자산</p>
            <p className="text-xl font-bold text-google-text">{formatCurrency(Math.round(simResults.expectedFv))}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">예상 은퇴 시점</p>
            <p className="text-xl font-bold text-point">
              {estimatedRetirementAgeStep4 ? `${estimatedRetirementAgeStep4}세` : '달성 불가'}
            </p>
            {estimatedRetirementAgeStep4 && (
              <p className="text-[10px] text-zinc-400 mt-1">지금으로부터 {estimatedRetirementAgeStep4 - state.step1.currentAge}년 후</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Sections */}
      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-google-text flex items-center gap-2">
            <Calculator size={20} className="text-brand" />
            재무 목표 요약
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4 border-google-gray bg-white">
              <p className="text-xs text-zinc-500 mb-1">은퇴 목표 자산</p>
              <p className="font-bold text-lg text-google-text">{formatCurrency(Math.round(step1Results.targetAmount))}</p>
            </div>
            <div className="card p-4 border-google-gray bg-white">
              <p className="text-xs text-zinc-500 mb-1">월 투자 가능 금액</p>
              <p className="font-bold text-lg text-google-text">{formatCurrency((state.step1.workIncome + state.step1.sideIncome) * (state.step1.investmentRate / 100))}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-google-text flex items-center gap-2">
            <Wallet size={20} className="text-brand" />
            계좌 활용 전략
          </h3>
          <div className="space-y-4">
            {step2Results.map(acc => (
              <div key={acc.rank} className="p-5 bg-white rounded-2xl border border-google-gray space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-brand/20">0{acc.rank}</span>
                    <p className="font-bold text-google-text">{acc.name}</p>
                  </div>
                  <span className="text-xs font-black text-point bg-point/10 px-2 py-0.5 rounded-full">비중 {acc.ratio}%</span>
                </div>
                <p className="text-xs text-zinc-500 font-medium italic">"{acc.description}"</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">추천 이유</p>
                    <p className="text-xs text-zinc-600 leading-relaxed">{acc.reason}</p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">활용법</p>
                    <p className="text-xs font-bold text-brand">{acc.usage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-google-text flex items-center gap-2">
            <TrendingUp size={20} className="text-brand" />
            자산 배분 가이드
          </h3>
          <div className="card p-6 border-google-gray bg-white space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold">{step3Results.type}</span>
              <span className="text-xs text-zinc-400 font-bold">매달 기계적 매수 원칙</span>
            </div>
            
            <div className="space-y-6">
              {step3Results.allocation.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-500">{item.name}</span>
                    <span className="font-black text-google-text">{item.ratio}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand shadow-sm" style={{ width: `${item.ratio}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-100 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">추천 이유</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{step3Results.recommendationReason}</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">투자 원칙</p>
                <p className="text-sm text-brand leading-relaxed italic font-bold">"{step3Results.rules}"</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <button 
        onClick={() => setState(INITIAL_STATE)}
        className="w-full py-4 bg-zinc-100 text-zinc-500 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
      >
        <RefreshCcw size={18} />
        처음부터 다시 설계하기
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    if (state.currentStep === 1) return state.showResult ? renderStep1Result() : renderStep1();
    if (state.currentStep === 2) return state.showResult ? renderStep2Result() : renderStep2();
    if (state.currentStep === 3) return state.showResult ? renderStep3Result() : renderStep3();
    if (state.currentStep === 4) return renderStep4();
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter text-google-text">INVESTWISE</h1>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 w-8 rounded-full transition-all ${
                  state.currentStep >= s ? 'bg-brand shadow-sm' : 'bg-zinc-200'
                }`} 
              />
            ))}
          </div>
        </div>
      </header>

      <main className="step-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${state.currentStep}-${state.showResult}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      {state.currentStep < 4 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-zinc-200 z-50">
          <div className="max-w-2xl mx-auto flex gap-3">
            {(state.currentStep > 1 || state.showResult) && (
              <button onClick={handleBack} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <ChevronLeft size={20} />
                이전
              </button>
            )}
            <button onClick={handleNext} className="btn-primary flex-[2] flex items-center justify-center gap-2">
              {state.showResult ? '다음 단계로' : '결과 확인하기'}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
