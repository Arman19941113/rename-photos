function MacShot({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none w-full overflow-hidden rounded-2xl shadow-2xl">
      <div className="relative flex h-8 w-full flex-shrink-0 items-center bg-[#E6E6E6]">
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="ml-5 mr-1.5"
        >
          <path
            d="M6.5 13C10.0899 13 13 10.0899 13 6.5C13 2.91015 10.0899 0 6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13Z"
            fill="#ED6A5E"
          />
        </svg>
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1.5"
        >
          <path
            d="M7 13C10.5899 13 13.5 10.0899 13.5 6.5C13.5 2.91015 10.5899 0 7 0C3.41015 0 0.5 2.91015 0.5 6.5C0.5 10.0899 3.41015 13 7 13Z"
            fill="#F4BF4F"
          />
        </svg>
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1.5"
        >
          <path
            d="M6.5 13C10.0899 13 13 10.0899 13 6.5C13 2.91015 10.0899 0 6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13Z"
            fill="#61C554"
          />
        </svg>
      </div>

      {children}
    </div>
  )
}

export default MacShot
