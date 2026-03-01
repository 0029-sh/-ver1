export interface Step1Data {
  currentAge: number;
  workIncome: number;
  sideIncome: number;
  investmentRate: number; // percentage
  retirementAge: number;
  monthlyLivingExpense: number;
  largeExpenses: Array<{ age: number; amount: number }>;
  salaryGrowthRate: number;
  inflationRate: number;
}

export interface Step2Data {
  investmentPreference: 'A' | 'B' | 'C';
}

export interface Step3Data {
  q1: '1' | '2' | '3';
  q2: '1' | '2' | '3';
  q3: number;
}

export interface AppState {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  currentStep: number;
  showResult: boolean;
}

export const INITIAL_STATE: AppState = {
  step1: {
    currentAge: 30,
    workIncome: 300,
    sideIncome: 0,
    investmentRate: 30,
    retirementAge: 60,
    monthlyLivingExpense: 250,
    largeExpenses: [],
    salaryGrowthRate: 3,
    inflationRate: 2,
  },
  step2: {
    investmentPreference: 'C',
  },
  step3: {
    q1: '2',
    q2: '2',
    q3: 1000,
  },
  currentStep: 1,
  showResult: false,
};
