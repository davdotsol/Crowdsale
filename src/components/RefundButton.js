const RefundButton = ({ crowdsale, account }) => {
  const handleRefund = async () => {
    try {
      const transaction = await crowdsale.claimRefund();
      await transaction.wait();
    } catch (error) {
      alert('Refund failed: ' + error.message);
    }
  };

  return (
    <div className="text-center m-20">
      <button
        className="flex-shrink-0 bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-sm border-4 text-white py-1 px-2 rounded"
        onClick={handleRefund}
      >
        Claim Refund
      </button>
    </div>
  );
};

export default RefundButton;
