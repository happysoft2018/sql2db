          SELECT *
          FROM orders 
          WHERE order_date >= '${startDate}' AND order_date <= '${endDate}'
