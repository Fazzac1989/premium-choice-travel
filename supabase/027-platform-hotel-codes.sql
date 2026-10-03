-- Point the Staycations site's curated hotels at the trade platform (generated 2026-10-03).
-- Run AFTER 026-platform.sql, in the Supabase SQL editor. Safe to run twice: each line only
-- changes a hotel whose code is still the old Hotelbeds number (026 keeps that number in hotelbeds_code).
-- Hotels not listed here are outside Dubai and have no platform match yet; they show no prices until
-- their destination is imported on the console and this list is regenerated.
begin;
update hotels set supplier_code = 'e8e94964-9020-42ce-8148-87539253ff5f' where id = 6 and supplier_code = '738790'; -- Atlantis The Royal => Atlantis, The Royal
update hotels set supplier_code = 'ea345b7d-f395-4e26-909d-fc9703557a24' where id = 22 and supplier_code = '64759'; -- JA The Resort => JA The Resort – JA Beach Hotel, Dubai
update hotels set supplier_code = 'a7cb9592-1684-4825-855f-2d1c8191f4ed' where id = 28 and supplier_code = '721498'; -- Riu Dubai => Hotel Riu Dubai - All Inclusive
update hotels set supplier_code = '45dcd2a2-1b5c-49a5-8106-0dbb28fa8c94' where id = 29 and supplier_code = '129814'; -- JA Hatta Fort Hotel => JA Hatta Fort Hotel
update hotels set supplier_code = 'b636417f-c723-4a05-9317-f18146fda843' where id = 12 and supplier_code = '164765'; -- Rixos The Palm Dubai Hotel & Suites => Rixos The Palm Hotel & Suites Ultra All Inclusive
update hotels set supplier_code = '145fba0f-d992-43bc-ab73-c99936be4f49' where id = 16 and supplier_code = '224014'; -- Sofitel Dubai The Palm => Sofitel Dubai The Palm
update hotels set supplier_code = '357e9a12-e715-41f8-a0a5-4c99358f55ee' where id = 13 and supplier_code = '578241'; -- FIVE Palm Jumeirah => Five Palm Jumeirah Dubai
update hotels set supplier_code = '47913718-c208-4600-bd2a-f040a1cd39ae' where id = 8 and supplier_code = '7656'; -- Jumeirah Beach Hotel => Jumeirah Beach Hotel Dubai
update hotels set supplier_code = '64741110-b4fb-468b-8ce8-6042d10da894' where id = 14 and supplier_code = '191488'; -- Fairmont The Palm => Fairmont The Palm
update hotels set supplier_code = '3289d059-e15c-4350-aa38-662583d207f8' where id = 9 and supplier_code = '545301'; -- Jumeirah Al Naseem => Jumeirah Al Naseem Dubai
update hotels set supplier_code = '0e24ddb8-fbf6-4f1e-9507-ae09c0c963a7' where id = 17 and supplier_code = '199054'; -- One&Only Royal Mirage => One & Only Royal Mirage
update hotels set supplier_code = 'b0afd333-fb10-438f-a795-f333eb3dacb8' where id = 25 and supplier_code = '539281'; -- Lapita, Dubai Parks and Resorts, Autograph Collection => Lapita,Dubai Parks & Resorts,Autograph Collection
update hotels set supplier_code = 'c391cc35-aab5-47b7-bf36-5498cd9c9a6e' where id = 5 and supplier_code = '103294'; -- Atlantis, The Palm => Atlantis The Palm
update hotels set supplier_code = 'afecfd7c-fcf2-4368-af9a-5dc544d00073' where id = 24 and supplier_code = '123580'; -- Al Maha, a Luxury Collection Desert Resort & Spa => Al Maha, a Luxury Collection Desert Resort & Spa
update hotels set supplier_code = 'bd5706e6-9e30-4dc0-b87f-81d231b988a2' where id = 18 and supplier_code = '9234'; -- Le Méridien Mina Seyahi Beach Resort & Waterpark => Le Meridien Mina Seyahi Beach Resort & Marina
update hotels set supplier_code = 'f27c9b5e-5438-4d66-93b5-819017517ce8' where id = 26 and supplier_code = '745918'; -- Rove La Mer Beach => Rove La Mer Beach, Jumeirah
update hotels set supplier_code = 'd180c3d0-9244-44cc-a647-284682248a46' where id = 15 and supplier_code = '216744'; -- Anantara The Palm Dubai Resort => Anantara The Palm Dubai Resort
update hotels set supplier_code = '2187bdcc-038f-4801-bb16-43980ea78cd7' where id = 10 and supplier_code = '96968'; -- Jumeirah Al Qasr => Jumeirah Al Qasr Dubai
update hotels set supplier_code = '1cfd463b-62ee-42ca-8a97-cad49fb989b5' where id = 21 and supplier_code = '115398'; -- Address Downtown => Address Downtown
update hotels set supplier_code = 'c2081241-c4f7-4da6-b250-31c948974244' where id = 19 and supplier_code = '93664'; -- The Ritz-Carlton, Dubai => The Ritz-Carlton, Dubai
update hotels set supplier_code = '2ec81c92-2d91-45d8-bd72-7b046f05889b' where id = 23 and supplier_code = '69559'; -- Bab Al Shams, A Rare Finds Desert Resort => Bab Al Shams Desert Resort & Spa
update hotels set supplier_code = '02b417dd-01c3-4323-9b8b-c9734a5c9521' where id = 11 and supplier_code = '744361'; -- Address Beach Resort => Address Beach Resort
update hotels set supplier_code = '240dbdff-64ff-4559-a2a7-d98e18829ab3' where id = 20 and supplier_code = '644547'; -- Banyan Tree Dubai => Banyan Tree Dubai
update hotels set supplier_code = '28db5819-311f-47c0-8825-547780d6d613' where id = 7 and supplier_code = '7660'; -- Burj Al Arab Jumeirah => Jumeirah Burj Al Arab Dubai
update hotels set supplier_code = 'f2a4edf2-e4eb-45e7-a38d-617b3b266939' where id = 27 and supplier_code = '884533'; -- Centara Mirage Beach Resort Dubai => Centara Mirage Beach Resort Dubai
commit;

-- check: 25 rows
select id, name, supplier_code, hotelbeds_code from hotels where supplier_code ~ '^[0-9a-f-]{36}$' order by id;
