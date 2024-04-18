const Progress = ({ price, tokensSold, maxTokens }) => {
  // Calculate width as a percentage
  const widthStyle = {
    width: `${(tokensSold / maxTokens) * 100}%`,
  };

  return (
    <>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={widthStyle} // Apply the calculated width here
        ></div>
      </div>
      <p className="text-center my-3">
        {tokensSold} / {maxTokens} Tokens Sold
      </p>
    </>
  );
};

export default Progress;
