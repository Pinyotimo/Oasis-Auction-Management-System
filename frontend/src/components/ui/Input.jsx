function Input({ className = '', ...props }) {
  return (
    <input 
      className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition ${className}`}
      {...props}
    />
  )
}

export default Input