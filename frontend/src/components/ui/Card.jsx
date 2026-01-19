import React from 'react'

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={
        'rounded-lg border border-gray-200 bg-white shadow-sm ' +
        'transition-all duration-200 hover:shadow-md hover:border-gray-300 ' +
        className
      }
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={'px-5 pt-4 pb-2 ' + className} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={'px-5 py-4 ' + className} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div className={'px-5 pt-2 pb-4 ' + className} {...props}>
      {children}
    </div>
  )
}

export default Card
