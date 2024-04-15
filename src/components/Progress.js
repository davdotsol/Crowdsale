const Progress = ({ price, tokensSold, maxTokens }) => {
  return (
    <>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          class="bg-blue-600 h-2.5 rounded-full"
          style="width: {`${(tokensSold / maxTokens) * 100}%`}"
        ></div>
      </div>
      <p className="text-center my-3">
        {tokensSold} / {maxTokens} Tokens Sold
      </p>
    </>
  );
};

export default Progress;
