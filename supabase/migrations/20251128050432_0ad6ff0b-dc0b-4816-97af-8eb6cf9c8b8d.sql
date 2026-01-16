-- Delete rooms that should not exist for Hotel des Deux Îles
DELETE FROM rooms 
WHERE hotel_id = '67dfefd2-6167-4bab-add9-d329bc4a1e93' 
AND number IN ('15', '51', '52', '54', '55', '61', '62');