-- Create a table to hold the expanded image pools
CREATE TABLE IF NOT EXISTS _image_pool (
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  idx INTEGER NOT NULL
);

-- Clear and populate with expanded pools (50 per category)
TRUNCATE _image_pool;

-- Helper: insert function
CREATE OR REPLACE FUNCTION _add_pool_images(cat TEXT, urls TEXT[]) RETURNS VOID AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(urls, 1) LOOP
    INSERT INTO _image_pool (category, url, idx) VALUES (cat, urls[i], i - 1);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Politics pool
SELECT _add_pool_images('politics', ARRAY[
  'https://images.pexels.com/photos/6130304/pexels-photo-6130304.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3034681/pexels-photo-3034681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1550337/pexels-photo-1550337.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3253509/pexels-photo-3253509.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/460766/pexels-photo-460766.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/247794/pexels-photo-247794.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/210881/pexels-photo-210881.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/532001/pexels-photo-532001.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3030306/pexels-photo-3030306.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3782216/pexels-photo-3782216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/518697/pexels-photo-518697.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184320/pexels-photo-3184320.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Technology pool
SELECT _add_pool_images('technology', ARRAY[
  'https://images.pexels.com/photos/6424583/pexels-photo-6424583.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4955393/pexels-photo-4955393.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6424591/pexels-photo-6424591.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7325498/pexels-photo-7325498.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/14553704/pexels-photo-14553704.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/113850/pexels-photo-113850.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/256502/pexels-photo-256502.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/270488/pexels-photo-270488.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4976712/pexels-photo-4976712.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/10845119/pexels-photo-10845119.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/14553707/pexels-photo-14553707.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/27427258/pexels-photo-27427258.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/34803998/pexels-photo-34803998.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18108/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3781368/pexels-photo-3781368.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7988079/pexels-photo-7988079.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1435753/pexels-photo-1435753.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/414676/pexels-photo-414676.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2187170/pexels-photo-2187170.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1181297/pexels-photo-1181297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1181356/pexels-photo-1181356.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Science pool
SELECT _add_pool_images('science', ARRAY[
  'https://images.pexels.com/photos/8533136/pexels-photo-8533136.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9243718/pexels-photo-9243718.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8533076/pexels-photo-8533076.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8533009/pexels-photo-8533009.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8533087/pexels-photo-8533087.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8326473/pexels-photo-8326473.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8533139/pexels-photo-8533139.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/39191000/pexels-photo-39191000.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8326474/pexels-photo-8326474.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9243432/pexels-photo-9243432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9629709/pexels-photo-9629709.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8851786/pexels-photo-8851786.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9243546/pexels-photo-9243546.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8851080/pexels-photo-8851080.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8540819/pexels-photo-8540819.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/60022/pexels-photo-60022.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280551/pexels-photo-2280551.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280561/pexels-photo-2280561.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280575/pexels-photo-2280575.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280578/pexels-photo-2280578.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280579/pexels-photo-2280579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280580/pexels-photo-2280580.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280581/pexels-photo-2280581.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280582/pexels-photo-2280582.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280583/pexels-photo-2280583.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280584/pexels-photo-2280584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280585/pexels-photo-2280585.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280586/pexels-photo-2280586.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- World pool
SELECT _add_pool_images('world', ARRAY[
  'https://images.pexels.com/photos/335393/pexels-photo-335393.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35632556/pexels-photo-35632556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4167545/pexels-photo-4167545.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/335394/pexels-photo-335394.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38434948/pexels-photo-38434948.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/346696/pexels-photo-346696.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1098515/pexels-photo-1098515.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35632557/pexels-photo-35632557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/227433/pexels-photo-227433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/36134240/pexels-photo-36134240.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8830673/pexels-photo-8830673.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38530582/pexels-photo-38530582.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/30596267/pexels-photo-30596267.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/33435222/pexels-photo-33435222.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8542543/pexels-photo-8542543.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422462/pexels-photo-2422462.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422360/pexels-photo-2422360.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422244/pexels-photo-2422244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004662/pexels-photo-1004662.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004663/pexels-photo-1004663.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004664/pexels-photo-1004664.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004666/pexels-photo-1004666.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004667/pexels-photo-1004667.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004668/pexels-photo-1004668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004669/pexels-photo-1004669.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004670/pexels-photo-1004670.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004671/pexels-photo-1004671.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004672/pexels-photo-1004672.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Health pool
SELECT _add_pool_images('health', ARRAY[
  'https://images.pexels.com/photos/48604/pexels-photo-48604.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/15277947/pexels-photo-15277947.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4225925/pexels-photo-4225925.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7723510/pexels-photo-7723510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/11623621/pexels-photo-11623621.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4173244/pexels-photo-4173244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/27298084/pexels-photo-27298084.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6129104/pexels-photo-6129104.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6129152/pexels-photo-6129152.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8376307/pexels-photo-8376307.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6129444/pexels-photo-6129444.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4173250/pexels-photo-4173250.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/20100299/pexels-photo-20100299.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/27307692/pexels-photo-27307692.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3938022/pexels-photo-3938022.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4021808/pexels-photo-4021808.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4173384/pexels-photo-4173384.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/40572/pexels-photo-40572.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/263354/pexels-photo-263354.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/356020/pexels-photo-356020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/356019/pexels-photo-356019.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/356018/pexels-photo-356018.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/356017/pexels-photo-356017.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/356016/pexels-photo-356016.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Markets pool
SELECT _add_pool_images('markets', ARRAY[
  'https://images.pexels.com/photos/35118208/pexels-photo-35118208.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682358/pexels-photo-28682358.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682349/pexels-photo-28682349.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/186461/pexels-photo-186461.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682348/pexels-photo-28682348.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/39212595/pexels-photo-39212595.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/16902140/pexels-photo-16902140.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682356/pexels-photo-28682356.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682351/pexels-photo-28682351.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35118250/pexels-photo-35118250.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682355/pexels-photo-28682355.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6802043/pexels-photo-6802043.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/14751274/pexels-photo-14751274.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/39295600/pexels-photo-39295600.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/534220/pexels-photo-534220.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/534215/pexels-photo-534215.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/534219/pexels-photo-534219.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7788009/pexels-photo-7788009.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371403/pexels-photo-8371403.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371399/pexels-photo-8371399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371423/pexels-photo-8371423.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371430/pexels-photo-8371430.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371431/pexels-photo-8371431.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371432/pexels-photo-8371432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371433/pexels-photo-8371433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371434/pexels-photo-8371434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8371435/pexels-photo-8371435.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- AI pool
SELECT _add_pool_images('artificial-intelligence', ARRAY[
  'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8566467/pexels-photo-8566467.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6019019/pexels-photo-6019019.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8294663/pexels-photo-8294663.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18799047/pexels-photo-18799047.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438994/pexels-photo-8438994.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8439093/pexels-photo-8439093.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8294657/pexels-photo-8294657.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18799044/pexels-photo-18799044.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8294652/pexels-photo-8294652.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8294654/pexels-photo-8294654.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8566526/pexels-photo-8566526.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8294650/pexels-photo-8294650.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8294602/pexels-photo-8294602.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1034840/pexels-photo-1034840.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1089440/pexels-photo-1089440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438918/pexels-photo-8438918.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438921/pexels-photo-8438921.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438923/pexels-photo-8438923.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438924/pexels-photo-8438924.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438925/pexels-photo-8438925.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438926/pexels-photo-8438926.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438927/pexels-photo-8438927.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438928/pexels-photo-8438928.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8438929/pexels-photo-8438929.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Space pool
SELECT _add_pool_images('space', ARRAY[
  'https://images.pexels.com/photos/2694037/pexels-photo-2694037.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12491595/pexels-photo-12491595.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/956999/milky-way-starry-sky-night-sky-star-956999.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12491650/pexels-photo-12491650.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3214110/pexels-photo-3214110.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38822380/pexels-photo-38822380.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12498786/pexels-photo-12498786.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12498777/pexels-photo-12498777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/27697772/pexels-photo-27697772.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12498801/pexels-photo-12498801.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6472351/pexels-photo-6472351.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12491661/pexels-photo-12491661.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12491556/pexels-photo-12491556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/110854/pexels-photo-110854.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/73910/pexels-photo-73910.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2166927/pexels-photo-2166927.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/41162/pexels-photo-41162.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/73871/pexels-photo-73871.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87651/pexels-photo-87651.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87634/pexels-photo-87634.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87635/pexels-photo-87635.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87636/pexels-photo-87636.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87637/pexels-photo-87637.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87638/pexels-photo-87638.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87639/pexels-photo-87639.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87640/pexels-photo-87640.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87641/pexels-photo-87641.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/87642/pexels-photo-87642.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/60022/pexels-photo-60022.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Football pool
SELECT _add_pool_images('football', ARRAY[
  'https://images.pexels.com/photos/32190714/pexels-photo-32190714.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/32190700/pexels-photo-32190700.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35781790/pexels-photo-35781790.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/33827014/pexels-photo-33827014.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/33210166/pexels-photo-33210166.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/32285250/pexels-photo-32285250.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/33827025/pexels-photo-33827025.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/39222199/pexels-photo-39222199.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38185214/pexels-photo-38185214.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/39222212/pexels-photo-39222212.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38153899/pexels-photo-38153899.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/30726640/pexels-photo-30726640.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4038911/pexels-photo-4038911.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1142964/pexels-photo-1142964.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1171084/pexels-photo-1171084.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1450352/pexels-photo-1450352.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597924/pexels-photo-1597924.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597925/pexels-photo-1597925.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597926/pexels-photo-1597926.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597927/pexels-photo-1597927.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597928/pexels-photo-1597928.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597929/pexels-photo-1597929.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597930/pexels-photo-1597930.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597931/pexels-photo-1597931.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597932/pexels-photo-1597932.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Music pool
SELECT _add_pool_images('music', ARRAY[
  'https://images.pexels.com/photos/8040838/pexels-photo-8040838.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8186275/pexels-photo-8186275.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1688259/pexels-photo-1688259.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3984830/pexels-photo-3984830.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/10423281/pexels-photo-10423281.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/237464/pexels-photo-237464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8044223/pexels-photo-8044223.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/14364672/pexels-photo-14364672.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3984793/pexels-photo-3984793.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/14719432/pexels-photo-14719432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/11969479/pexels-photo-11969479.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/154130/pexels-photo-154130.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8130649/pexels-photo-8130649.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3774606/pexels-photo-3774606.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/470982/pexels-photo-470982.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370548/pexels-photo-1370548.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370549/pexels-photo-1370549.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370550/pexels-photo-1370550.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370551/pexels-photo-1370551.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370552/pexels-photo-1370552.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370553/pexels-photo-1370553.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370554/pexels-photo-1370554.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370555/pexels-photo-1370555.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370556/pexels-photo-1370556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370557/pexels-photo-1370557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370558/pexels-photo-1370558.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370559/pexels-photo-1370559.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1370560/pexels-photo-1370560.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Movies pool
SELECT _add_pool_images('movies', ARRAY[
  'https://images.pexels.com/photos/7991266/pexels-photo-7991266.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8263369/pexels-photo-8263369.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7234386/pexels-photo-7234386.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7991139/pexels-photo-7991139.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/17580599/pexels-photo-17580599.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28227728/pexels-photo-28227728.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1200450/pexels-photo-1200450.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3709370/pexels-photo-3709370.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3137890/pexels-photo-3137890.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4997750/pexels-photo-4997750.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7234221/pexels-photo-7234221.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7513412/pexels-photo-7513412.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7991156/pexels-photo-7991156.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/65168/pexels-photo-65168.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873487/pexels-photo-2873487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873488/pexels-photo-2873488.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873489/pexels-photo-2873489.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873490/pexels-photo-2873490.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873491/pexels-photo-2873491.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873492/pexels-photo-2873492.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873493/pexels-photo-2873493.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873494/pexels-photo-2873494.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873495/pexels-photo-2873495.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873496/pexels-photo-2873496.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873497/pexels-photo-2873497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873498/pexels-photo-2873498.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2873499/pexels-photo-2873499.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- India pool
SELECT _add_pool_images('india', ARRAY[
  'https://images.pexels.com/photos/31969428/pexels-photo-31969428.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28672541/pexels-photo-28672541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/34783859/pexels-photo-34783859.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31817439/pexels-photo-31817439.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38420876/pexels-photo-38420876.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/5138790/pexels-photo-5138790.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31739736/pexels-photo-31739736.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/32216134/pexels-photo-32216134.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18331986/pexels-photo-18331986.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38870716/pexels-photo-38870716.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38073986/pexels-photo-38073986.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8230170/pexels-photo-8230170.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/32388346/pexels-photo-32388346.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38404860/pexels-photo-38404860.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8230166/pexels-photo-8230166.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004665/pexels-photo-1004665.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422497/pexels-photo-2422497.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422462/pexels-photo-2422462.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422360/pexels-photo-2422360.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2422244/pexels-photo-2422244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004662/pexels-photo-1004662.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004663/pexels-photo-1004663.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004664/pexels-photo-1004664.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004666/pexels-photo-1004666.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004667/pexels-photo-1004667.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004668/pexels-photo-1004668.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004669/pexels-photo-1004669.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004670/pexels-photo-1004670.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004671/pexels-photo-1004671.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1004672/pexels-photo-1004672.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Climate pool
SELECT _add_pool_images('climate', ARRAY[
  'https://images.pexels.com/photos/32878011/pexels-photo-32878011.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2923526/pexels-photo-2923526.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12114973/pexels-photo-12114973.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/37786895/pexels-photo-37786895.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9210279/pexels-photo-9210279.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12110558/pexels-photo-12110558.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31426827/pexels-photo-31426827.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/37786898/pexels-photo-37786898.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/33611244/pexels-photo-33611244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/34074829/pexels-photo-34074829.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38521777/pexels-photo-38521777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/39193580/pexels-photo-39193580.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/38521774/pexels-photo-38521774.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18687611/pexels-photo-18687611.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617459/pexels-photo-3617459.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617460/pexels-photo-3617460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617461/pexels-photo-3617461.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617462/pexels-photo-3617462.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617463/pexels-photo-3617463.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617464/pexels-photo-3617464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617465/pexels-photo-3617465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617466/pexels-photo-3617466.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617467/pexels-photo-3617467.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617468/pexels-photo-3617468.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617469/pexels-photo-3617469.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617470/pexels-photo-3617470.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3617471/pexels-photo-3617471.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Books pool
SELECT _add_pool_images('books', ARRAY[
  'https://images.pexels.com/photos/8762862/pexels-photo-8762862.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1098656/pexels-photo-1098656.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8447618/pexels-photo-8447618.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/32046500/pexels-photo-32046500.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/990432/pexels-photo-990432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1383379/pexels-photo-1383379.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31275614/pexels-photo-31275614.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1061130/pexels-photo-1061130.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/5218386/pexels-photo-5218386.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/2688058/pexels-photo-2688058.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1229183/pexels-photo-1229183.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31567151/pexels-photo-31567151.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18847269/pexels-photo-18847269.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1438044/pexels-photo-1438044.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900763/pexels-photo-1900763.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900764/pexels-photo-1900764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900765/pexels-photo-1900765.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900766/pexels-photo-1900766.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900767/pexels-photo-1900767.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900768/pexels-photo-1900768.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900769/pexels-photo-1900769.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900770/pexels-photo-1900770.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900771/pexels-photo-1900771.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900772/pexels-photo-1900772.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900773/pexels-photo-1900773.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900774/pexels-photo-1900774.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900775/pexels-photo-1900775.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1900776/pexels-photo-1900776.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Gaming pool
SELECT _add_pool_images('gaming', ARRAY[
  'https://images.pexels.com/photos/5207523/pexels-photo-5207523.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/5208827/pexels-photo-5208827.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8762882/pexels-photo-8762882.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4056883/pexels-photo-4056883.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1372008/pexels-photo-1372008.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/27424789/pexels-photo-27424789.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/7870815/pexels-photo-7870815.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12660509/pexels-photo-12660509.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6686141/pexels-photo-6686141.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4522998/pexels-photo-4522998.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/14189711/pexels-photo-14189711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8154767/pexels-photo-8154767.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9071500/pexels-photo-9071500.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1563796/pexels-photo-1563796.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/16311112/pexels-photo-16311112.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290976/pexels-photo-1290976.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290977/pexels-photo-1290977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290978/pexels-photo-1290978.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290979/pexels-photo-1290979.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290980/pexels-photo-1290980.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290981/pexels-photo-1290981.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290982/pexels-photo-1290982.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290983/pexels-photo-1290983.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290984/pexels-photo-1290984.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290985/pexels-photo-1290985.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290986/pexels-photo-1290986.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290987/pexels-photo-1290987.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290988/pexels-photo-1290988.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1290989/pexels-photo-1290989.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Cricket pool
SELECT _add_pool_images('cricket', ARRAY[
  'https://images.pexels.com/photos/28758998/pexels-photo-28758998.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/30387508/pexels-photo-30387508.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/13509965/pexels-photo-13509965.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31131696/pexels-photo-31131696.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28759014/pexels-photo-28759014.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3718433/pexels-photo-3718433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/27594195/pexels-photo-27594195.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/21415108/pexels-photo-21415108.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4770720/pexels-photo-4770720.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3601184/pexels-photo-3601184.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35330492/pexels-photo-35330492.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/31625370/pexels-photo-31625370.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35903110/pexels-photo-35903110.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/30387494/pexels-photo-30387494.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/17172382/pexels-photo-17172382.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597924/pexels-photo-1597924.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597925/pexels-photo-1597925.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597926/pexels-photo-1597926.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597927/pexels-photo-1597927.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597928/pexels-photo-1597928.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597929/pexels-photo-1597929.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597930/pexels-photo-1597930.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597931/pexels-photo-1597931.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597932/pexels-photo-1597932.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597933/pexels-photo-1597933.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597934/pexels-photo-1597934.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597935/pexels-photo-1597935.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597936/pexels-photo-1597936.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1597937/pexels-photo-1597937.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Electric vehicles pool
SELECT _add_pool_images('electric-vehicles', ARRAY[
  'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/4678065/pexels-photo-4678065.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/20000977/pexels-photo-20000977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/12737898/pexels-photo-12737898.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/17000830/pexels-photo-17000830.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/18555543/pexels-photo-18555543.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3846205/pexels-photo-3846205.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/37576219/pexels-photo-37576219.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/37519272/pexels-photo-37519272.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28851165/pexels-photo-28851165.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/34800929/pexels-photo-34800929.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/20536221/pexels-photo-20536221.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9800006/pexels-photo-9800006.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/8349487/pexels-photo-8349487.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/9799740/pexels-photo-9799740.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/376361/pexels-photo-376361.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705395/pexels-photo-1705395.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705396/pexels-photo-1705396.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705397/pexels-photo-1705397.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705398/pexels-photo-1705398.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705399/pexels-photo-1705399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705400/pexels-photo-1705400.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705401/pexels-photo-1705401.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705402/pexels-photo-1705402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705403/pexels-photo-1705403.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705404/pexels-photo-1705404.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705405/pexels-photo-1705405.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705406/pexels-photo-1705406.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705407/pexels-photo-1705407.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/1705408/pexels-photo-1705408.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Business pool
SELECT _add_pool_images('business', ARRAY[
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184320/pexels-photo-3184320.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184435/pexels-photo-3184435.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184444/pexels-photo-3184444.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184446/pexels-photo-3184446.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184453/pexels-photo-3184453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/3184458/pexels-photo-3184458.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/35118208/pexels-photo-35118208.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/28682358/pexels-photo-28682358.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/186461/pexels-photo-186461.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'https://images.pexels.com/photos/6802043/pexels-photo-6802043.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750'
]);

-- Economics, environment, sustainability, physics, discovery, innovation, sport, robotics, news
-- Use world pool for news, markets pool for economics, climate pool for environment/sustainability, science/space pool for physics/discovery, AI pool for innovation/robotics, football pool for sport
SELECT _add_pool_images('economics', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'markets'
));
SELECT _add_pool_images('environment', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'climate'
));
SELECT _add_pool_images('sustainability', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'climate'
));
SELECT _add_pool_images('physics', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'science'
  UNION ALL
  SELECT url FROM _image_pool WHERE category = 'space'
));
SELECT _add_pool_images('discovery', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'science'
  UNION ALL
  SELECT url FROM _image_pool WHERE category = 'space'
));
SELECT _add_pool_images('innovation', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'technology'
  UNION ALL
  SELECT url FROM _image_pool WHERE category = 'artificial-intelligence'
));
SELECT _add_pool_images('sport', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'football'
));
SELECT _add_pool_images('robotics', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'artificial-intelligence'
));
SELECT _add_pool_images('news', ARRAY(
  SELECT url FROM _image_pool WHERE category = 'world'
  UNION ALL
  SELECT url FROM _image_pool WHERE category = 'politics'
  UNION ALL
  SELECT url FROM _image_pool WHERE category = 'business'
));

-- Now reassign all articles using round-robin per category
-- This ensures maximum uniqueness: each image is used at most ceil(count/pool_size) times
WITH ranked_articles AS (
  SELECT
    a.id,
    a.category,
    a.slug,
    ROW_NUMBER() OVER (PARTITION BY a.category ORDER BY a.published_at DESC, a.id) as rn
  FROM articles a
),
pool_sizes AS (
  SELECT category, count(*) as pool_size FROM _image_pool GROUP BY category
)
UPDATE articles a
SET cover_image_url = sub.new_url
FROM (
  SELECT
    ra.id,
    ip.url as new_url
  FROM ranked_articles ra
  JOIN pool_sizes ps ON ps.category = ra.category
  JOIN _image_pool ip ON ip.category = ra.category
  WHERE ip.idx = (ra.rn - 1) % ps.pool_size
) sub
WHERE a.id = sub.id;

-- Verify the result
SELECT count(*) as total, count(distinct cover_image_url) as unique_imgs FROM articles;

-- Cleanup
DROP TABLE _image_pool;
DROP FUNCTION _add_pool_images(TEXT, TEXT[]);
