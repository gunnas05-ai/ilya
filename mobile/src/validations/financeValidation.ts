export const financeValidation = {
  validateExpense: (amount: string) => {
    if (!amount) return { valid: false, error: 'Tutar zorunludur.' };
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return { valid: false, error: 'Geçerli bir pozitif tutar giriniz.' };
    return { valid: true };
  }
};
