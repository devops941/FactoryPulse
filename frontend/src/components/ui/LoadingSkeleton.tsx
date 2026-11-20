interface LoadingSkeletonProps {
  className?: string
  count?: number
  height?: string
}

export function LoadingSkeleton({ className = 'h-12 w-full', count = 1, height }: LoadingSkeletonProps) {
  const finalClass = height ? `${height} w-full` : className
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${finalClass} animate-pulse rounded-lg bg-slate-200/80`}
        />
      ))}
    </>
  )
}

export default LoadingSkeleton
