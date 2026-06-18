const QRCode = require('qrcode');

const PAYMENT_METHODS = ['COD', 'UPI', 'QR'];

const createUpiPayment = async (amount) => {
  const upiId = String(process.env.UPI_ID || 'yourupiid@upi').trim();
  const payeeName = String(process.env.UPI_PAYEE_NAME || 'Darkside Coffee').trim();
  const normalizedAmount = Number(amount).toFixed(2);
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: normalizedAmount,
    cu: 'INR',
    tn: 'Darkside Coffee order payment'
  });
  const upiUri = `upi://pay?${params.toString()}`;
  const qrCode = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#241b17',
      light: '#fffaf2'
    }
  });

  return {
    upiId,
    payeeName,
    amount: Number(normalizedAmount),
    currency: 'INR',
    upiUri,
    qrCode
  };
};

module.exports = { PAYMENT_METHODS, createUpiPayment };
