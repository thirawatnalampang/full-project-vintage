--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-10-10 23:37:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 227 (class 1255 OID 18235)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16702)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16701)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- TOC entry 4960 (class 0 OID 0)
-- Dependencies: 219
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- TOC entry 224 (class 1259 OID 16741)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    product_id integer,
    quantity integer NOT NULL,
    price_per_unit numeric(10,2) NOT NULL,
    name text,
    size text,
    line_total numeric(12,2) DEFAULT 0 NOT NULL,
    image text,
    unit_price numeric(10,2),
    variant_key text,
    measures jsonb
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16740)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- TOC entry 4961 (class 0 OID 0)
-- Dependencies: 223
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- TOC entry 226 (class 1259 OID 18202)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    user_id integer,
    total_price numeric(12,2),
    status text,
    created_at timestamp with time zone,
    order_code text,
    email text,
    full_name text,
    phone text,
    address_line text,
    subdistrict text,
    district text,
    province text,
    postcode text,
    shipping_method text,
    payment_method text,
    subtotal numeric(12,2),
    shipping numeric(12,2),
    total_qty integer,
    note text,
    updated_at timestamp with time zone,
    payment_status text,
    paid_at timestamp with time zone,
    payment_amount numeric(12,2),
    slip_image text,
    tracking_carrier text,
    tracking_code text,
    cancelled_restocked_at timestamp with time zone,
    cancel_reason text,
    cancelled_by text,
    cancelled_at timestamp with time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 18201)
-- Name: orders_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq1 OWNER TO postgres;

--
-- TOC entry 4962 (class 0 OID 0)
-- Dependencies: 225
-- Name: orders_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq1 OWNED BY public.orders.id;


--
-- TOC entry 222 (class 1259 OID 16711)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    category_id integer,
    image text,
    description text,
    stock integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    measure_variants jsonb,
    images_json text DEFAULT '[]'::text
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16710)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 4963 (class 0 OID 0)
-- Dependencies: 221
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 218 (class 1259 OID 16687)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100),
    password text NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    address text,
    phone character varying(20),
    profile_image text,
    email_verified boolean DEFAULT false,
    province text,
    district text,
    subdistrict text,
    zipcode character varying(5)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16686)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4964 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4767 (class 2604 OID 16705)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- TOC entry 4774 (class 2604 OID 16744)
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- TOC entry 4776 (class 2604 OID 18205)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq1'::regclass);


--
-- TOC entry 4768 (class 2604 OID 16714)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 4763 (class 2604 OID 16690)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4948 (class 0 OID 16702)
-- Dependencies: 220
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name) FROM stdin;
1	เสื้อวง
2	เสื้อวินเทจ
3	เสื้อฮาเล่
4	เสื้อผ้าบาง
\.


--
-- TOC entry 4952 (class 0 OID 16741)
-- Dependencies: 224
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, price_per_unit, name, size, line_total, image, unit_price, variant_key, measures) FROM stdin;
1	1	5	1	2300.00	Long Branch 80s	อก 19.5″ / ยาว 29″	2300.00	/uploads/products/product_cover_1758551143718_eya35.webp	2300.00	c19.5-l29	{"chest_in": 19.5, "length_in": 29}
2	2	45	1	2490.00	BearWhizBeer	อก 20.5″ / ยาว 25.5″	2490.00	/uploads/products/product_cover_1759220355657_bg14a.webp	2490.00	c20.5-l25.5	{"chest_in": 20.5, "length_in": 25.5}
3	3	20	1	2500.00	Harley Davidson	อก 18″ / ยาว 26.3″	2500.00	/uploads/products/product_cover_1758641145746_3gepj.webp	2500.00	c18-l26.3	{"chest_in": 18, "length_in": 26.3}
4	3	37	1	550.00	Harley Davidson	อก 21.3″ / ยาว 27.7″	550.00	/uploads/products/product_cover_1759219005277_nwbu8.webp	550.00	c21.3-l27.7	{"chest_in": 21.3, "length_in": 27.7}
5	3	32	1	790.00	Space jam 90s	อก 21.3″ / ยาว 28.5″	790.00	/uploads/products/product_cover_1759218377777_wqwlz.webp	790.00	c21.3-l28.5	{"chest_in": 21.3, "length_in": 28.5}
6	3	4	1	2590.00	Eric Clapton 90s	อก 23″ / ยาว 28.5″	2590.00	/uploads/products/product_cover_1758550979895_payar.webp	2590.00	c23-l28.5	{"chest_in": 23, "length_in": 28.5}
7	4	35	1	300.00	Kurt	อก 18″ / ยาว 26″	300.00	/uploads/products/product_cover_1759218659461_4qdg6.webp	300.00	c18-l26	{"chest_in": 18, "length_in": 26}
8	5	34	1	400.00	Rolling stone	อก 19.5″ / ยาว 28″	400.00	/uploads/products/product_cover_1759218582929_hp6er.webp	400.00	c19.5-l28	{"chest_in": 19.5, "length_in": 28}
9	6	9	1	200.00	BUZZ LIGHT YEAR	อก 21″ / ยาว 28″	200.00	/uploads/products/product_cover_1758551870593_g0tig.webp	200.00	c21-l28	{"chest_in": 21, "length_in": 28}
10	7	46	1	1800.00	WILD LIFE 80s	อก 18.5″ / ยาว 27.5″	1800.00	/uploads/products/product_cover_1759220514750_1zb5n.webp	1800.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
11	8	9	1	200.00	BUZZ LIGHT YEAR	อก 21″ / ยาว 28″	200.00	/uploads/products/product_cover_1758551870593_g0tig.webp	200.00	c21-l28	{"chest_in": 21, "length_in": 28}
12	9	44	1	2500.00	Jack Daneil’s 80s	อก 19.7″ / ยาว 28″	2500.00	/uploads/products/product_cover_1759220264367_9u0r5.webp	2500.00	c19.7-l28	{"chest_in": 19.7, "length_in": 28}
13	10	44	1	2500.00	Jack Daneil’s 80s	อก 19.7″ / ยาว 28″	2500.00	/uploads/products/product_cover_1759220264367_9u0r5.webp	2500.00	c19.7-l28	{"chest_in": 19.7, "length_in": 28}
14	11	44	1	2500.00	Jack Daneil’s 80s	อก 19.7″ / ยาว 28″	2500.00	/uploads/products/product_cover_1759220264367_9u0r5.webp	2500.00	c19.7-l28	{"chest_in": 19.7, "length_in": 28}
15	12	40	1	1890.00	Harley Davidson	อก 23″ / ยาว 28.7″	1890.00	/uploads/products/product_cover_1759219850700_2znw0.webp	1890.00	c23-l28.7	{"chest_in": 23, "length_in": 28.7}
16	13	14	1	1500.00	ลายทหาร 80s	อก 18.5″ / ยาว 27.5″	1500.00	/uploads/products/product_cover_1758640590155_n0xtf.webp	1500.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
17	14	9	2	200.00	BUZZ LIGHT YEAR	อก 21″ / ยาว 28″	400.00	/uploads/products/product_cover_1758551870593_g0tig.webp	200.00	c21-l28	{"chest_in": 21, "length_in": 28}
18	15	5	1	2300.00	Long Branch 80s	อก 19.5″ / ยาว 29″	2300.00	/uploads/products/product_cover_1758551143718_eya35.webp	2300.00	c19.5-l29	{"chest_in": 19.5, "length_in": 29}
19	15	29	1	2500.00	Harley Davidson	อก 19″ / ยาว 27″	2500.00	/uploads/products/product_cover_1759218079183_tvb1k.webp	2500.00	c19-l27	{"chest_in": 19, "length_in": 27}
20	15	28	1	2500.00	Backroads 80s	อก 17.5″ / ยาว 26.7″	2500.00	/uploads/products/product_cover_1759217983759_rq7h4.webp	2500.00	c17.5-l26.7	{"chest_in": 17.5, "length_in": 26.7}
21	16	36	1	790.00	Harley Davidson	อก 21.7″ / ยาว 28″	790.00	/uploads/products/product_cover_1759218825553_3n8yo.webp	790.00	c21.7-l28	{"chest_in": 21.7, "length_in": 28}
22	17	6	1	4990.00	Harley Davidson 90s	อก 20″ / ยาว 26.5″	4990.00	/uploads/products/product_cover_1758551257385_xmrwo.webp	4990.00	c20-l26.5	{"chest_in": 20, "length_in": 26.5}
23	18	44	1	2500.00	Jack Daneil’s 80s	อก 19.7″ / ยาว 28″	2500.00	/uploads/products/product_cover_1759220264367_9u0r5.webp	2500.00	c19.7-l28	{"chest_in": 19.7, "length_in": 28}
24	19	42	1	250.00	CHEV 90s	อก 19.5″ / ยาว 26.7″	250.00	/uploads/products/product_cover_1759220046693_ig6ja.webp	250.00	c19.5-l26.7	{"chest_in": 19.5, "length_in": 26.7}
25	20	42	1	250.00	CHEV 90s	อก 19.5″ / ยาว 26.7″	250.00	/uploads/products/product_cover_1759220046693_ig6ja.webp	250.00	c19.5-l26.7	{"chest_in": 19.5, "length_in": 26.7}
26	21	47	1	650.00	Snap on 80s	อก 20.5″ / ยาว 26.3″	650.00	/uploads/products/product_cover_1759220586328_mk9sn.webp	650.00	c20.5-l26.3	{"chest_in": 20.5, "length_in": 26.3}
27	22	46	1	1800.00	WILD LIFE 80s	อก 18.5″ / ยาว 27.5″	1800.00	/uploads/products/product_cover_1759220514750_1zb5n.webp	1800.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
28	23	35	1	300.00	Kurt	อก 18″ / ยาว 26″	300.00	/uploads/products/product_cover_1759218659461_4qdg6.webp	300.00	c18-l26	{"chest_in": 18, "length_in": 26}
29	24	47	1	650.00	Snap on 80s	อก 20.5″ / ยาว 26.3″	650.00	/uploads/products/product_cover_1759220586328_mk9sn.webp	650.00	c20.5-l26.3	{"chest_in": 20.5, "length_in": 26.3}
30	25	34	1	400.00	Rolling stone	อก 19.5″ / ยาว 28″	400.00	/uploads/products/product_cover_1759218582929_hp6er.webp	400.00	c19.5-l28	{"chest_in": 19.5, "length_in": 28}
31	26	7	1	2590.00	Motley Crue 80s	อก 20.7″ / ยาว 26″	2590.00	/uploads/products/product_cover_1758551389729_0llor.webp	2590.00	c20.7-l26	{"chest_in": 20.7, "length_in": 26}
32	27	46	1	1800.00	WILD LIFE 80s	อก 18.5″ / ยาว 27.5″	1800.00	/uploads/products/product_cover_1759220514750_1zb5n.webp	1800.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
33	28	42	2	250.00	CHEV 90s	อก 19.5″ / ยาว 26.7″	500.00	/uploads/products/product_cover_1759220046693_ig6ja.webp	250.00	c19.5-l26.7	{"chest_in": 19.5, "length_in": 26.7}
34	29	42	1	250.00	CHEV 90s	อก 19.5″ / ยาว 26.7″	250.00	/uploads/products/product_cover_1759220046693_ig6ja.webp	250.00	c19.5-l26.7	{"chest_in": 19.5, "length_in": 26.7}
35	30	40	1	1890.00	Harley Davidson	อก 23″ / ยาว 28.7″	1890.00	/uploads/products/product_cover_1759219850700_2znw0.webp	1890.00	c23-l28.7	{"chest_in": 23, "length_in": 28.7}
36	31	46	1	1800.00	WILD LIFE 80s	อก 18.5″ / ยาว 27.5″	1800.00	/uploads/products/product_cover_1759220514750_1zb5n.webp	1800.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
37	32	30	1	6900.00	Iron Maiden 80s	อก 17.7″ / ยาว 25″	6900.00	/uploads/products/product_cover_1759218185713_afq8v.webp	6900.00	c17.7-l25	{"chest_in": 17.7, "length_in": 25}
38	33	47	1	650.00	Snap on 80s	อก 20.5″ / ยาว 26.3″	650.00	/uploads/products/product_cover_1759220586328_mk9sn.webp	650.00	c20.5-l26.3	{"chest_in": 20.5, "length_in": 26.3}
39	34	29	1	2500.00	Harley Davidson	อก 19″ / ยาว 27″	2500.00	/uploads/products/product_cover_1759218079183_tvb1k.webp	2500.00	c19-l27	{"chest_in": 19, "length_in": 27}
40	35	26	1	4000.00	Harley Davidson 80s	อก 19.5″ / ยาว 27″	4000.00	/uploads/products/product_cover_1759217835682_leu67.webp	4000.00	c19.5-l27	{"chest_in": 19.5, "length_in": 27}
41	36	9	1	200.00	BUZZ LIGHT YEAR	อก 21″ / ยาว 28″	200.00	/uploads/products/product_cover_1758551870593_g0tig.webp	200.00	c21-l28	{"chest_in": 21, "length_in": 28}
42	37	13	1	2500.00	Harley Davidson 80s	อก 17″ / ยาว 26″	2500.00	/uploads/products/product_cover_1758640499600_l89ni.webp	2500.00	c17-l26	{"chest_in": 17, "length_in": 26}
43	38	35	1	300.00	Kurt	อก 18″ / ยาว 26″	300.00	/uploads/products/product_cover_1759218659461_4qdg6.webp	300.00	c18-l26	{"chest_in": 18, "length_in": 26}
44	39	1	1	5590.00	Harley Davidson 90s	อก 20″ / ยาว 28″	5590.00	/uploads/products/product_cover_1758549603044_q16b0.webp	5590.00	c20-l28	{"chest_in": 20, "length_in": 28}
45	40	35	1	300.00	Kurt	อก 18″ / ยาว 26″	300.00	/uploads/products/product_cover_1759218659461_4qdg6.webp	300.00	c18-l26	{"chest_in": 18, "length_in": 26}
46	41	35	1	300.00	Kurt	อก 18″ / ยาว 26″	300.00	/uploads/products/product_cover_1759218659461_4qdg6.webp	300.00	c18-l26	{"chest_in": 18, "length_in": 26}
47	42	44	1	2500.00	Jack Daneil’s 80s	อก 19.7″ / ยาว 28″	2500.00	/uploads/products/product_cover_1759220264367_9u0r5.webp	2500.00	c19.7-l28	{"chest_in": 19.7, "length_in": 28}
48	43	18	1	4000.00	Harley Davidson 80s	อก 20.3″ / ยาว 28.5″	4000.00	/uploads/products/product_cover_1758640950860_sjxtk.webp	4000.00	c20.3-l28.5	{"chest_in": 20.3, "length_in": 28.5}
49	44	47	1	650.00	Snap on 80s	อก 20.5″ / ยาว 26.3″	650.00	/uploads/products/product_cover_1759220586328_mk9sn.webp	650.00	c20.5-l26.3	{"chest_in": 20.5, "length_in": 26.3}
50	45	34	1	400.00	Rolling stone	อก 19.5″ / ยาว 28″	400.00	/uploads/products/product_cover_1759218582929_hp6er.webp	400.00	c19.5-l28	{"chest_in": 19.5, "length_in": 28}
51	46	33	1	950.00	Che guevara	อก 22″ / ยาว 27.5″	950.00	/uploads/products/product_cover_1759218455498_mylsa.webp	950.00	c22-l27.5	{"chest_in": 22, "length_in": 27.5}
52	47	39	1	1850.00	Harley Davidson	อก 21.3″ / ยาว 29″	1850.00	/uploads/products/product_cover_1759219556775_idu42.webp	1850.00	c21.3-l29	{"chest_in": 21.3, "length_in": 29}
53	48	13	1	2500.00	Harley Davidson 80s	อก 17″ / ยาว 26″	2500.00	/uploads/products/product_cover_1758640499600_l89ni.webp	2500.00	c17-l26	{"chest_in": 17, "length_in": 26}
54	49	40	1	1890.00	Harley Davidson	อก 23″ / ยาว 28.7″	1890.00	/uploads/products/product_cover_1759219850700_2znw0.webp	1890.00	c23-l28.7	{"chest_in": 23, "length_in": 28.7}
55	50	5	1	2300.00	Long Branch 80s	อก 19.5″ / ยาว 29″	2300.00	/uploads/products/product_cover_1758551143718_eya35.webp	2300.00	c19.5-l29	{"chest_in": 19.5, "length_in": 29}
56	51	46	1	1800.00	WILD LIFE 80s	อก 18.5″ / ยาว 27.5″	1800.00	/uploads/products/product_cover_1759220514750_1zb5n.webp	1800.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
57	52	18	1	4000.00	Harley Davidson 80s	อก 20.3″ / ยาว 28.5″	4000.00	/uploads/products/product_cover_1758640950860_sjxtk.webp	4000.00	c20.3-l28.5	{"chest_in": 20.3, "length_in": 28.5}
58	53	11	1	11500.00	Harley Davidson 80s	อก 18″ / ยาว 27.5″	11500.00	/uploads/products/product_cover_1758640347666_b5ssb.webp	11500.00	c18-l27.5	{"chest_in": 18, "length_in": 27.5}
59	54	26	1	4000.00	Harley Davidson 80s	อก 19.5″ / ยาว 27″	4000.00	/uploads/products/product_cover_1759217835682_leu67.webp	4000.00	c19.5-l27	{"chest_in": 19.5, "length_in": 27}
60	55	16	1	2850.00	Grateful Dead 70s	อก 19.5″ / ยาว 24″	2850.00	/uploads/products/product_cover_1758640775790_gp7y5.webp	2850.00	c19.5-l24	{"chest_in": 19.5, "length_in": 24}
61	56	5	1	2300.00	Long Branch 80s	อก 19.5″ / ยาว 29″	2300.00	/uploads/products/product_cover_1758551143718_eya35.webp	2300.00	c19.5-l29	{"chest_in": 19.5, "length_in": 29}
62	57	8	1	1390.00	Camel 80s	อก 20.5″ / ยาว 28″	1390.00	/uploads/products/product_cover_1758551596879_06lg6.webp	1390.00	c20.5-l28	{"chest_in": 20.5, "length_in": 28}
63	58	20	1	2500.00	Harley Davidson	อก 18″ / ยาว 26.3″	2500.00	/uploads/products/product_cover_1758641145746_3gepj.webp	2500.00	c18-l26.3	{"chest_in": 18, "length_in": 26.3}
64	59	5	1	2300.00	Long Branch 80s	อก 19.5″ / ยาว 29″	2300.00	/uploads/products/product_cover_1758551143718_eya35.webp	2300.00	c19.5-l29	{"chest_in": 19.5, "length_in": 29}
65	60	4	1	2590.00	Eric Clapton 90s	อก 23″ / ยาว 28.5″	2590.00	/uploads/products/product_cover_1758550979895_payar.webp	2590.00	c23-l28.5	{"chest_in": 23, "length_in": 28.5}
66	61	31	1	3500.00	Scorpions 80s	อก 18.5″ / ยาว 25″	3500.00	/uploads/products/product_cover_1759218294113_bfqho.webp	3500.00	c18.5-l25	{"chest_in": 18.5, "length_in": 25}
67	62	19	1	3550.00	Harley Davidson 80s	อก 19.3″ / ยาว 25.5″	3550.00	/uploads/products/product_cover_1758641034509_8mlr2.webp	3550.00	c19.3-l25.5	{"chest_in": 19.3, "length_in": 25.5}
68	63	37	1	550.00	Harley Davidson	อก 21.3″ / ยาว 27.7″	550.00	/uploads/products/product_cover_1759219005277_nwbu8.webp	550.00	c21.3-l27.7	{"chest_in": 21.3, "length_in": 27.7}
69	64	46	1	1800.00	WILD LIFE 80s	อก 18.5″ / ยาว 27.5″	1800.00	/uploads/products/product_cover_1759220514750_1zb5n.webp	1800.00	c18.5-l27.5	{"chest_in": 18.5, "length_in": 27.5}
70	65	40	1	1890.00	Harley Davidson	อก 23″ / ยาว 28.7″	1890.00	/uploads/products/product_cover_1759219850700_2znw0.webp	1890.00	c23-l28.7	{"chest_in": 23, "length_in": 28.7}
71	66	38	1	1890.00	Harley Davidson	อก 23.7″ / ยาว 30.5″	1890.00	/uploads/products/product_cover_1759219133071_t20eo.webp	1890.00	c23.7-l30.5	{"chest_in": 23.7, "length_in": 30.5}
72	67	40	1	1890.00	Harley Davidson	อก 23″ / ยาว 28.7″	1890.00	/uploads/products/product_cover_1759219850700_2znw0.webp	1890.00	c23-l28.7	{"chest_in": 23, "length_in": 28.7}
\.


--
-- TOC entry 4954 (class 0 OID 18202)
-- Dependencies: 226
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, total_price, status, created_at, order_code, email, full_name, phone, address_line, subdistrict, district, province, postcode, shipping_method, payment_method, subtotal, shipping, total_qty, note, updated_at, payment_status, paid_at, payment_amount, slip_image, tracking_carrier, tracking_code, cancelled_restocked_at, cancel_reason, cancelled_by, cancelled_at) FROM stdin;
7	62	1850.00	cancelled	2025-10-07 17:13:11.979148+07	OD-20251007-171311-82B816	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988840515	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	1800.00	50.00	1		2025-10-07 17:15:31.210442+07	unpaid	\N	\N	\N	\N	\N	2025-10-07 17:15:31.210442+07	หดด	buyer	2025-10-07 17:15:31.210442+07
2	68	2540.00	cancelled	2025-10-06 23:06:34.666103+07	OD-20251006-230634-758689	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	2490.00	50.00	1		2025-10-06 23:06:40.83743+07	unpaid	\N	\N	\N	\N	\N	2025-10-06 23:06:40.83743+07	ขกรอ	buyer	2025-10-06 23:06:40.83743+07
16	78	840.00	done	2025-10-09 17:57:55.708369+07	OD-20251009-175755-396834	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	หนองคอนไทย	ภูเขียว	ชัยภูมิ	36110	standard	cod	790.00	50.00	1		2025-10-09 17:58:09.384763+07	paid	2025-10-09 17:58:09.384763+07	\N	\N	flash	4554	\N	\N	\N	\N
14	62	450.00	done	2025-10-09 17:37:05.411835+07	OD-20251009-173705-ABE24C	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	400.00	50.00	2		2025-10-09 17:38:40.388645+07	paid	2025-10-09 17:38:40.388645+07	\N	\N	flash	4554	\N	\N	\N	\N
13	80	1550.00	done	2025-10-09 17:05:36.849694+07	OD-20251009-170536-98884C	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	1500.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-09 17:05:47.626656+07	\N	\N	flash	5757	\N	\N	\N	\N
8	69	250.00	done	2025-10-07 17:24:14.243545+07	OD-20251007-172414-75B03B	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	200.00	50.00	1		2025-10-07 18:32:56.035408+07	paid	2025-10-07 18:32:56.035408+07	\N	\N	thailandpost	54645	\N	\N	\N	\N
6	62	250.00	done	2025-10-07 16:59:58.303789+07	OD-20251007-165958-6E9352	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988840515	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	200.00	50.00	1		2025-10-07 17:00:23.041763+07	paid	2025-10-07 17:00:23.041763+07	\N	\N	flash	1441	\N	\N	\N	\N
10	62	2550.00	cancelled	2025-10-08 16:34:40.67768+07	OD-20251008-163440-093B20	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988840515	100/275 หมู่บ้านวรารักษ์	ท่าก๊อ	แม่สรวย	เชียงราย	57180	standard	cod	2500.00	50.00	1		2025-10-08 16:34:49.795765+07	unpaid	\N	\N	\N	\N	\N	2025-10-08 16:34:49.795765+07	ยกเลิก	buyer	2025-10-08 16:34:49.795765+07
1	80	2350.00	done	2025-10-06 23:03:19.213969+07	OD-20251006-230319-986009	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	หมู่บ้านรางเนื้อตาย	เสนา	เสนา	พระนครศรีอยุธยา	13110	standard	cod	2300.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-06 23:03:32.840408+07	\N	\N	jnt	2424	\N	\N	\N	\N
11	68	2550.00	done	2025-10-09 16:17:25.649039+07	OD-20251009-161725-DFE83F	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	2500.00	50.00	1		2025-10-09 16:17:40.620096+07	paid	2025-10-09 16:17:40.620096+07	\N	\N	thailandpost	575	\N	\N	\N	\N
3	78	6430.00	done	2025-10-06 23:30:25.115959+07	OD-20251006-233025-EF40CB	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	ด่านแม่แฉลบ	ศรีสวัสดิ์	กาญจนบุรี	71250	standard	cod	6430.00	0.00	4		2025-10-10 00:05:41.39617+07	paid	2025-10-06 23:30:33.955052+07	\N	\N	kerry	46545	\N	\N	\N	\N
15	78	7300.00	done	2025-10-09 17:39:19.666311+07	OD-20251009-173919-167092	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	ด่านแม่แฉลบ	ศรีสวัสดิ์	กาญจนบุรี	71250	standard	cod	7300.00	0.00	3		2025-10-10 00:05:41.39617+07	paid	2025-10-09 17:40:38.031905+07	\N	\N	kerry	2442	\N	\N	\N	\N
12	80	1940.00	done	2025-10-09 16:57:57.856921+07	OD-20251009-165757-6CB060	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	1890.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-09 16:58:05.718622+07	\N	\N	flash	1441	\N	\N	\N	\N
18	69	2550.00	cancelled	2025-10-09 19:50:26.284598+07	OD-20251009-195026-E992F2	projecthalf2@gmail.com	ปวีณา สส	0988405158	จอม	ท่าข้าม	เวียงแก่น	เชียงราย	57310	standard	cod	2500.00	50.00	1		2025-10-09 19:53:02.853575+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 19:53:02.853575+07	หมด	admin	2025-10-09 19:53:02.853575+07
17	69	5040.00	done	2025-10-09 18:03:52.582623+07	OD-20251009-180352-6DA8BC	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	4990.00	50.00	1		2025-10-09 18:04:14.706987+07	paid	2025-10-09 18:04:14.706987+07	\N	\N	jnt	56454	\N	\N	\N	\N
19	68	300.00	done	2025-10-09 19:58:57.799627+07	OD-20251009-195857-F2645F	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	250.00	50.00	1		2025-10-09 20:00:25.587086+07	paid	2025-10-09 19:59:58.012466+07	\N	\N	best	66585	\N	\N	\N	\N
20	62	300.00	done	2025-10-09 20:00:45.446261+07	OD-20251009-200045-02F16D	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	250.00	50.00	1		2025-10-09 20:01:28.201015+07	paid	2025-10-09 20:01:28.201015+07	\N	\N	ninjavan	2424	\N	\N	\N	\N
21	68	700.00	cancelled	2025-10-09 20:04:46.647737+07	OD-20251009-200446-863B7A	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	650.00	50.00	1		2025-10-09 20:04:54.737333+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 20:04:54.737333+07	รอนานจัด	buyer	2025-10-09 20:04:54.737333+07
22	68	1850.00	cancelled	2025-10-09 20:05:04.2497+07	OD-20251009-200504-47A372	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	1800.00	50.00	1		2025-10-09 20:05:24.931988+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 20:05:24.931988+07	หมดค้าบทุกเเบบ	admin	2025-10-09 20:05:24.931988+07
23	62	350.00	cancelled	2025-10-09 20:34:50.976696+07	OD-20251009-203450-97EE03	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	300.00	50.00	1		2025-10-09 20:35:01.01495+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 20:35:01.01495+07	ผิด	buyer	2025-10-09 20:35:01.01495+07
24	68	700.00	done	2025-10-09 20:37:37.230343+07	OD-20251009-203737-467938	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	650.00	50.00	1		2025-10-09 20:38:03.358408+07	paid	2025-10-09 20:37:59.298475+07	\N	\N	jnt	55858	\N	\N	\N	\N
4	80	350.00	done	2025-10-07 00:14:03.47398+07	OD-20251007-001403-C6013B	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	หมู่บ้านรางเนื้อตาย	เสนา	เสนา	พระนครศรีอยุธยา	13110	standard	cod	300.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-07 00:17:42.093252+07	\N	\N	flash	131	\N	\N	\N	\N
25	68	450.00	cancelled	2025-10-09 20:43:26.873408+07	OD-20251009-204326-2B0B06	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	400.00	50.00	1		2025-10-09 20:44:05.809595+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 20:44:05.809595+07	ขก รอ	buyer	2025-10-09 20:44:05.809595+07
30	69	1940.00	done	2025-10-09 22:02:49.686043+07	OD-20251009-220249-07235D	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	1890.00	50.00	1		2025-10-09 22:10:33.916919+07	paid	2025-10-09 22:10:33.916919+07	\N	\N	flash	5445	\N	\N	\N	\N
26	78	2640.00	done	2025-10-09 20:52:25.774177+07	OD-20251009-205225-37748C	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	หนองคอนไทย	ภูเขียว	ชัยภูมิ	36110	standard	cod	2590.00	50.00	1		2025-10-09 20:54:10.058546+07	paid	2025-10-09 20:54:10.058546+07	\N	\N	flash	4545	\N	\N	\N	\N
27	69	1850.00	cancelled	2025-10-09 21:00:18.690527+07	OD-20251009-210018-0A4489	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	1800.00	50.00	1		2025-10-09 21:00:31.530076+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 21:00:31.530076+07	หมดจ้า	admin	2025-10-09 21:00:31.530076+07
28	78	550.00	done	2025-10-09 21:29:25.053863+07	OD-20251009-212925-0E53EC	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	หนองคอนไทย	ภูเขียว	ชัยภูมิ	36110	standard	cod	500.00	50.00	2		2025-10-09 21:29:53.306441+07	paid	2025-10-09 21:29:49.325448+07	\N	\N	thailandpost	4554	\N	\N	\N	\N
29	68	300.00	done	2025-10-09 21:34:15.302191+07	OD-20251009-213415-95C76F	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	250.00	50.00	1		2025-10-09 21:34:25.74688+07	paid	2025-10-09 21:34:25.74688+07	\N	\N	best	4554	\N	\N	\N	\N
34	68	2550.00	done	2025-10-09 23:25:07.883867+07	OD-20251009-232507-C13537	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	2500.00	50.00	1		2025-10-09 23:25:28.274967+07	paid	2025-10-09 23:25:24.224052+07	\N	\N	jnt	455445	\N	\N	\N	\N
32	69	6900.00	done	2025-10-09 23:18:25.772697+07	OD-20251009-231825-1C2484	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	transfer	6900.00	0.00	1		2025-10-09 23:18:53.477602+07	paid	2025-10-09 23:18:50.084416+07	6900.00	/uploads/slips/slip_1760026705807_fobza.webp	flash	4545	\N	\N	\N	\N
31	68	1850.00	cancelled	2025-10-09 22:15:18.540525+07	OD-20251009-221518-82EB1B	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	1800.00	50.00	1		2025-10-09 23:19:01.253308+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 23:19:01.253308+07	หมด	admin	2025-10-09 23:19:01.253308+07
33	68	700.00	cancelled	2025-10-09 23:19:30.174521+07	OD-20251009-231930-973593	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	สบปราบ	สบปราบ	ลำปาง	52170	standard	cod	650.00	50.00	1		2025-10-09 23:19:35.323926+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 23:19:35.323926+07	ขกรอ	buyer	2025-10-09 23:19:35.323926+07
5	80	450.00	done	2025-10-07 00:22:11.270944+07	OD-20251007-002211-23B52E	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	หมู่บ้านรางเนื้อตาย	เสนา	เสนา	พระนครศรีอยุธยา	13110	standard	cod	400.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-07 00:30:50.812888+07	\N	\N	kerry	55	\N	\N	\N	\N
55	69	2900.00	done	2025-10-10 12:45:02.790322+07	OD-20251010-124502-D59EFC	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	transfer	2850.00	50.00	1		2025-10-10 12:45:25.549372+07	paid	2025-10-10 12:45:20.214431+07	2900.00	/uploads/slips/slip_1760075102802_ln8dc.webp	kerry	assa	\N	\N	\N	\N
9	80	2550.00	cancelled	2025-10-08 15:00:24.270359+07	OD-20251008-150024-B80228	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	หมู่บ้านรางเนื้อตาย	เสนา	เสนา	พระนครศรีอยุธยา	13110	standard	cod	2500.00	50.00	1		2025-10-10 02:05:44.955645+07	unpaid	\N	\N	\N	\N	\N	2025-10-09 16:13:01.901818+07	หมด	buyer	2025-10-09 16:13:01.901818+07
35	80	4050.00	done	2025-10-10 00:36:22.012572+07	OD-20251010-003622-52BC06	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	4000.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-10 00:36:54.792814+07	\N	\N	kerry	4545	\N	\N	\N	\N
36	80	250.00	done	2025-10-10 01:11:03.841825+07	OD-20251010-011103-7123A0	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	200.00	50.00	1		2025-10-10 02:05:44.955645+07	paid	2025-10-10 01:11:20.821737+07	\N	\N	flash	54645	\N	\N	\N	\N
41	78	350.00	done	2025-10-10 02:33:03.944129+07	OD-20251010-023303-757DD2	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	standard	cod	300.00	50.00	1		2025-10-10 02:33:14.676486+07	paid	2025-10-10 02:33:14.676486+07	\N	\N	flash	4545	\N	\N	\N	\N
37	80	2550.00	done	2025-10-10 02:10:03.798766+07	OD-20251010-021003-286E29	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	2500.00	50.00	1		2025-10-10 02:10:27.846435+07	paid	2025-10-10 02:10:22.741205+07	\N	\N	thailandpost	4545	\N	\N	\N	\N
38	69	380.00	done	2025-10-10 02:22:35.244636+07	OD-20251010-022235-EA9BFD	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	express	cod	300.00	80.00	1		2025-10-10 02:23:02.937073+07	paid	2025-10-10 02:23:01.643938+07	\N	\N	jnt	5757	\N	\N	\N	\N
42	69	2580.00	cancelled	2025-10-10 02:39:37.26042+07	OD-20251010-023937-59A23C	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	express	cod	2500.00	80.00	1		2025-10-10 03:09:49.411661+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 03:09:49.411661+07	หมด	admin	2025-10-10 03:09:49.411661+07
39	78	5590.00	done	2025-10-10 02:29:45.78949+07	OD-20251010-022945-DED98E	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	standard	cod	5590.00	0.00	1		2025-10-10 02:30:05.431768+07	paid	2025-10-10 02:30:03.526234+07	\N	\N	kerry	4545	\N	\N	\N	\N
43	78	4080.00	done	2025-10-10 03:09:23.069459+07	OD-20251010-030923-E6EBB1	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	express	cod	4000.00	80.00	1		2025-10-10 03:09:56.337171+07	paid	2025-10-10 03:09:56.337171+07	\N	\N	kerry	5757	\N	\N	\N	\N
40	69	350.00	done	2025-10-10 02:31:31.456428+07	OD-20251010-023131-52CF50	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	300.00	50.00	1		2025-10-10 02:32:20.202431+07	paid	2025-10-10 02:32:16.390218+07	\N	\N	kerry	5757	\N	\N	\N	\N
49	68	1940.00	cancelled	2025-10-10 12:00:41.071239+07	OD-20251010-120041-82FC76	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0575767567	บ้านลำปาง	โพนงาม	คำชะอี	มุกดาหาร	49110	standard	cod	1890.00	50.00	1		2025-10-10 12:01:15.97336+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 12:01:15.97336+07	หมด	admin	2025-10-10 12:01:15.97336+07
44	68	700.00	done	2025-10-10 03:40:02.852325+07	OD-20251010-034002-644034	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0988405158	บ้านลำปาง	โพนงาม	คำชะอี	มุกดาหาร	49110	standard	cod	650.00	50.00	1		2025-10-10 03:40:23.399286+07	paid	2025-10-10 03:40:23.399286+07	\N	\N	kerry	4545	\N	\N	\N	\N
45	78	450.00	cancelled	2025-10-10 03:43:19.395029+07	OD-20251010-034319-52D7D0	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	standard	cod	400.00	50.00	1		2025-10-10 03:43:27.783715+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 03:43:27.783715+07	รอนาน	buyer	2025-10-10 03:43:27.783715+07
46	78	1000.00	cancelled	2025-10-10 03:43:39.035756+07	OD-20251010-034339-DE6B9B	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	standard	cod	950.00	50.00	1		2025-10-10 03:43:50.935097+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 03:43:50.935097+07	สั่งมั่ว	admin	2025-10-10 03:43:50.935097+07
50	68	2350.00	cancelled	2025-10-10 12:02:24.537036+07	OD-20251010-120224-514330	thirawat.na@ku.th	สมพร ณ ลำปาง	0575767567	บ้านลำปาง	โคกสะอาด	ศรีเทพ	เพชรบูรณ์	67170	standard	cod	2300.00	50.00	1		2025-10-10 12:03:18.977218+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 12:03:18.977218+07	sdas	buyer	2025-10-10 12:03:18.977218+07
47	78	1930.00	done	2025-10-10 03:46:57.674349+07	OD-20251010-034657-8EACA2	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	express	transfer	1850.00	80.00	1		2025-10-10 03:47:28.152767+07	paid	2025-10-10 03:47:18.733556+07	1930.00	/uploads/slips/slip_1760042817723_2tt72.webp	jnt	42542	\N	\N	\N	\N
48	78	2550.00	done	2025-10-10 11:55:29.121321+07	OD-20251010-115529-7737E9	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	standard	cod	2500.00	50.00	1		2025-10-10 11:55:51.599235+07	paid	2025-10-10 11:55:51.599235+07	\N	\N	kerry	444	\N	\N	\N	\N
53	69	11580.00	cancelled	2025-10-10 12:40:40.767135+07	OD-20251010-124040-B9BBD3	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	express	transfer	11500.00	80.00	1		2025-10-10 12:42:02.683253+07	rejected	\N	11580.00	/uploads/slips/slip_1760074840795_oe7xl.webp	\N	\N	2025-10-10 12:41:14.919563+07	หมด	buyer	2025-10-10 12:41:14.919563+07
51	69	1850.00	done	2025-10-10 12:10:23.349935+07	OD-20251010-121023-ABC423	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	1800.00	50.00	1		2025-10-10 12:10:34.152548+07	paid	2025-10-10 12:10:34.152548+07	\N	\N	jnt	5454	\N	\N	\N	\N
52	80	4050.00	done	2025-10-10 12:29:31.825318+07	OD-20251010-122931-2AAFD3	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	4000.00	50.00	1	ชอบมากครับ	2025-10-10 12:43:38.569755+07	paid	2025-10-10 12:43:38.569755+07	\N	\N	\N	\N	\N	\N	\N	\N
54	69	4050.00	done	2025-10-10 12:43:11.09963+07	OD-20251010-124311-300626	projecthalf2@gmail.com	ปวีณา สส	0988405158	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	4000.00	50.00	1		2025-10-10 12:43:25.07133+07	paid	2025-10-10 12:43:25.07133+07	\N	\N	kerry	fghfg	\N	\N	\N	\N
56	78	2380.00	done	2025-10-10 12:46:44.655218+07	OD-20251010-124644-E8CA0D	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	express	cod	2300.00	80.00	1	ขอกล่องดีๆ	2025-10-10 12:47:08.476673+07	paid	2025-10-10 12:47:03.733935+07	\N	\N	ninjavan	11	\N	\N	\N	\N
62	62	3630.00	done	2025-10-10 20:12:17.101867+07	OD-20251010-201217-717D23	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	express	transfer	3550.00	80.00	1		2025-10-10 20:12:37.096869+07	paid	2025-10-10 20:12:30.547732+07	3630.00	/uploads/slips/slip_1760101937141_zq96y.webp	jnt	454554	\N	\N	\N	\N
57	68	1440.00	done	2025-10-10 14:02:43.761138+07	OD-20251010-140243-B0FEC7	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0575767567	บ้านลำปาง	โพนงาม	คำชะอี	มุกดาหาร	49110	standard	cod	1390.00	50.00	1		2025-10-10 14:02:57.116392+07	paid	2025-10-10 14:02:57.116392+07	\N	\N	kerry	4554	\N	\N	\N	\N
58	80	2550.00	done	2025-10-10 16:21:49.217949+07	OD-20251010-162149-E3C63B	thirawatnalampang@gmail.com	ถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	2500.00	50.00	1		2025-10-10 16:22:22.465181+07	paid	2025-10-10 16:22:22.465181+07	\N	\N	flash	4554	\N	\N	\N	\N
59	78	2350.00	done	2025-10-10 20:00:15.504536+07	OD-20251010-200015-2F9E3A	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	standard	cod	2300.00	50.00	1		2025-10-10 20:00:27.134936+07	paid	2025-10-10 20:00:27.134936+07	\N	\N	kerry	4554	\N	\N	\N	\N
63	62	600.00	done	2025-10-10 20:34:15.273173+07	OD-20251010-203415-204D27	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	550.00	50.00	1		2025-10-10 20:34:27.932601+07	paid	2025-10-10 20:34:27.932601+07	\N	\N	flash	4545	\N	\N	\N	\N
60	68	2670.00	done	2025-10-10 20:01:11.755503+07	OD-20251010-200111-11FA1B	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0575767567	บ้านลำปาง	โพนงาม	คำชะอี	มุกดาหาร	49110	express	cod	2590.00	80.00	1		2025-10-10 20:01:24.062471+07	paid	2025-10-10 20:01:24.062471+07	\N	\N	flash	4545	\N	\N	\N	\N
61	78	3580.00	done	2025-10-10 20:10:12.892037+07	OD-20251010-201012-09F3CC	46719@ayw.ac.th	ถิรวัฒน์ วิธิสินธุ์	0988405158	เเพร่กาญ 12\n	เวียงชัย	เวียงชัย	เชียงราย	57210	express	cod	3500.00	80.00	1		2025-10-10 20:10:30.114838+07	paid	2025-10-10 20:10:30.114838+07	\N	\N	kerry	4554	\N	\N	\N	\N
67	69	1940.00	cancelled	2025-10-10 22:16:07.669556+07	OD-20251010-221607-707852	projecthalf2@gmail.com	ปวีณา สส	0898264296	หมู่13	เกาะกูด	เกาะกูด	ตราด	23000	standard	cod	1890.00	50.00	1		2025-10-10 22:16:16.819937+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 22:16:16.819937+07	รอนานจัด	buyer	2025-10-10 22:16:16.819937+07
66	69	1940.00	done	2025-10-10 22:14:54.357343+07	OD-20251010-221454-87DF1A	projecthalf2@gmail.com	ปวีณา สาว	0284949494	หมู่13	แม่สา	แม่ริม	เชียงใหม่	50180	standard	cod	1890.00	50.00	1		2025-10-10 23:19:20.824101+07	paid	2025-10-10 22:15:15.340035+07	\N	\N	kerry	fgfd4gdf4gdf	\N	\N	\N	\N
64	62	1850.00	done	2025-10-10 21:38:41.012987+07	OD-20251010-213841-AFCAE4	taerevv07@gmail.com	นายถิรวัฒน์ ณ ลำปาง	0988405158	100/275 หมู่บ้านวรารักษ์	ลำตาเสา	วังน้อย	พระนครศรีอยุธยา	13170	standard	cod	1800.00	50.00	1		2025-10-10 21:39:10.422391+07	paid	2025-10-10 21:38:58.126533+07	\N	\N	flash	78787	\N	\N	\N	\N
65	68	1940.00	cancelled	2025-10-10 22:13:18.825772+07	OD-20251010-221318-24CF6F	thirawat.na@ku.th	สมพร วิธิสิทธุ์	0575767567	บ้านลำปาง	แม่อิง	ภูกามยาว	พะเยา	56000	standard	cod	1890.00	50.00	1		2025-10-10 22:13:32.475264+07	unpaid	\N	\N	\N	\N	\N	2025-10-10 22:13:32.475264+07	ขกรอ	buyer	2025-10-10 22:13:32.475264+07
\.


--
-- TOC entry 4950 (class 0 OID 16711)
-- Dependencies: 222
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price, category_id, image, description, stock, created_at, status, updated_at, measure_variants, images_json) FROM stdin;
3	The beatle 80s	2990.00	1	/uploads/products/product_cover_1758550818508_czev4.webp	Tag: ป้ายจาง\r\nSize: อก 17.3 ยาว 23.5\r\nCondition: 8.7/10 ตำหนิตามรูป คอฟิต ผ้า50/50 แขนจั้ม ชายล่างตะเข็บเดี่ยว ปี83	1	2025-09-22 21:20:18.853024	active	2025-09-22 21:20:22.26079	[{"stock": 1, "chest_in": 17.3, "length_in": 23.5}]	["/uploads/products/product_img_1758550818606_l5n3i.webp","/uploads/products/product_img_1758550818669_f31xb.webp","/uploads/products/product_img_1758550818741_uqu4b.webp"]
5	Long Branch 80s	2300.00	4	/uploads/products/product_cover_1758551143718_eya35.webp	Tag: Sport-t\r\nSize: M อก 19.5 ยาว 29\r\nCondition:9/10 ตำหนิมีรอยเปื้อนตามรูป คอฟิต สกรีนแห้งๆคมๆ ผ้า50 แขนจั้ม-ชายเดี่ยว	0	2025-09-22 21:25:43.943037	active	2025-10-10 20:00:15.504536	[{"stock": 0, "chest_in": 19.5, "length_in": 29}]	["/uploads/products/product_img_1758551143764_1ao4v.webp","/uploads/products/product_img_1758551143813_eli9y.webp","/uploads/products/product_img_1758551143863_r5svm.webp"]
2	WINCHESTER	2990.00	2	/uploads/products/product_cover_1758550218623_xv9yr.webp	Tag: ป้ายขาว\r\nSize: อก 20.5 ยาว 28.5\r\nCondition : 8.8/10 ตำหนิตามรูป มี2-3รูเล็ก คอฟิต ผ้า50/50 แขนจั้ม-ชายเดี่ยว	1	2025-09-22 21:10:18.742859	active	2025-09-30 14:39:51.86687	[{"stock": 1, "chest_in": 20.5, "length_in": 28.5}]	["/uploads/products/product_img_1758550218660_wq0na.webp","/uploads/products/product_img_1758550233926_0089c.webp","/uploads/products/product_img_1758550233982_uduyk.webp"]
8	Camel 80s	1390.00	2	/uploads/products/product_cover_1758551596879_06lg6.webp	Size: อก 20.5 ยาว 28\r\nCondition: 8.9/10 ตำหนิตามรูป คอฟิต ทรงเสื้อสวยๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1988	1	2025-09-22 21:33:17.160923	active	2025-10-10 14:03:39.987175	[{"stock": 1, "chest_in": 20.5, "length_in": 28}]	["/uploads/products/product_img_1758551596926_18g1y.webp","/uploads/products/product_img_1758551596966_4ljuf.webp","/uploads/products/product_img_1758551597026_wq1tx.webp","/uploads/products/product_img_1758551597091_w2eyv.webp"]
7	Motley Crue 80s	2590.00	1	/uploads/products/product_cover_1758551389729_0llor.webp	Tag: brockum\r\nSize : L อก 20.7 ยาว 26\r\nCondition: 8.9/10 ตำหนิด้ายรัน1จุดตามรูป(ไปเก็บงานได้) ตีเผื่อ1รูมด คอย้วยเล็กน้อย สกรีนแห้งๆคมๆแตกร้าวตามกาลเวลา ผ้า100 สีดรอป 0.5 เบอร์ ตะเข็บเดี่ยวบน-ล่างคู่ ไม่ข้าง ตอกปี1989	1	2025-09-22 21:29:49.891279	active	2025-10-09 21:35:17.10898	[{"stock": 1, "chest_in": 20.7, "length_in": 26}]	["/uploads/products/product_img_1758551389772_dkqea.webp","/uploads/products/product_img_1758551389814_obnmx.webp","/uploads/products/product_img_1758551395328_1jok5.webp"]
6	Harley Davidson 90s	4990.00	3	/uploads/products/product_cover_1758551257385_xmrwo.webp	Size: อก 20 ยาว 26.5\r\nCondition: 9/10 ตำหนิป้ายหลุด(เย็บเก็บงานให้ใหม่) คอฟิต สกรีนแห้งๆคมๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1990\r\n	1	2025-09-22 21:27:37.679955	active	2025-10-09 20:02:35.653234	[{"stock": 1, "chest_in": 20, "length_in": 26.5}]	["/uploads/products/product_img_1758551257426_jrq2h.webp","/uploads/products/product_img_1758551257484_sj5p5.webp","/uploads/products/product_img_1758551257543_x5229.webp","/uploads/products/product_img_1758551257603_15ca9.webp"]
36	Harley Davidson	790.00	2	/uploads/products/product_cover_1759218825553_3n8yo.webp	Tag: Harley Davidson\r\nSize: อก 21.7 ยาว 28\r\nCondition: 8.9/10 ตำหนิมีรอยด่างตามรูป ผ้า100 ตะเข็บคู่บน-ล่าง\r\n	0	2025-09-30 14:53:45.787746	active	2025-10-09 17:57:55.708369	[{"stock": 0, "chest_in": 21.7, "length_in": 28}]	["/uploads/products/product_img_1759218825594_8zm3n.webp","/uploads/products/product_img_1759218825637_ibjhe.webp","/uploads/products/product_img_1759218825701_gppub.webp"]
34	Rolling stone	400.00	1	/uploads/products/product_cover_1759218582929_hp6er.webp	Tag: Rolling Stone\r\nSize: อก 19.5 ยาว 28\r\nCondition: 8.5/10 ตำหนิตามรูป สีเสื้อไม่ค่อยเสมอกัน ตะเข็บคู่บน-ล่าง มีข้าง ผ้า100	1	2025-09-30 14:49:43.278632	active	2025-10-10 03:43:27.783715	[{"size": null, "stock": 1, "chest_in": 19.5, "length_in": 28}]	["/uploads/products/product_img_1759218582974_ddaae.webp","/uploads/products/product_img_1759218583018_vf3ry.webp","/uploads/products/product_img_1759218583081_datlh.webp"]
9	BUZZ LIGHT YEAR	200.00	4	/uploads/products/product_cover_1758551870593_g0tig.webp	Tag: ป้ายปั้มคอ Toy Story\r\nSize: L อก 21 ยาว 28\r\nCondition: 9/10 ตำหนิตามรูป คอสวย สกรีนแห้งๆคมๆ ตะเข็บคู่บน-ล่าง	1	2025-09-22 21:37:50.814967	active	2025-10-10 01:11:03.841825	[{"stock": 1, "chest_in": 21, "length_in": 28}]	["/uploads/products/product_img_1758551870653_kxkzj.webp","/uploads/products/product_img_1758551870717_i7qxs.webp"]
33	Che guevara	950.00	1	/uploads/products/product_cover_1759218455498_mylsa.webp	Tag: Solid Rock\r\nSize: อก 22 ยาว 27.5\r\nCondition: 9/10 4รูเข็ม ตะเข็บคู่บน-ล่าง ไม่มีข้าง ผ้า100	1	2025-09-30 14:47:35.859499	active	2025-10-10 03:43:50.935097	[{"size": null, "stock": 1, "chest_in": 22, "length_in": 27.5}]	["/uploads/products/product_img_1759218455544_ivv7v.webp","/uploads/products/product_img_1759218455582_rqm7o.webp","/uploads/products/product_img_1759218455634_aar9c.webp"]
12	Harley Davidson 80s	4500.00	3	/uploads/products/product_cover_1758640425383_0256g.webp	Tag: Sportswear\r\nSize: อก 18.3 ยาว 25\r\nCondition: 9/10 ตำหนิตามรูป คอฟิตๆ สกรีนสวยๆคมๆแห้งๆ สีเสื้อดำสวยๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-23 22:13:45.66225	active	2025-09-23 22:13:45.66225	[{"stock": 1, "chest_in": 18.3, "length_in": 25}]	["/uploads/products/product_img_1758640425445_ea56e.webp","/uploads/products/product_img_1758640425493_ao6j0.webp","/uploads/products/product_img_1758640425561_3h6tm.webp"]
13	Harley Davidson 80s	2500.00	3	/uploads/products/product_cover_1758640499600_l89ni.webp	Tag: ป้ายขาวจางๆ\r\nSize: อก 17 ยาว 26\r\nCondition: 9/10 มี1รูปตามรูป คอฟิต สกรีนสวยๆคมๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง มีข้างเดิม	1	2025-09-23 22:14:59.890122	active	2025-10-10 16:22:11.785563	[{"stock": 1, "chest_in": 17, "length_in": 26}]	["/uploads/products/product_img_1758640499652_hd160.webp","/uploads/products/product_img_1758640499720_w87yq.webp","/uploads/products/product_img_1758640499795_ivq2l.webp"]
15	Ac dc	4500.00	1	/uploads/products/product_cover_1758640688840_9a6z9.webp	Tag: ป้ายจาง\r\nSize: อก 21.5 ยาว 27.3\r\nCondition: 9/10 ตำหนิตามรูป สีเสื้อออกเฟดสวยๆ คอสวย สกรีนแห้งๆคมๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-23 22:18:09.141978	active	2025-09-27 02:44:56.248258	[{"stock": 1, "chest_in": 21.5, "length_in": 27.3}]	["/uploads/products/product_img_1758640688900_15pw9.webp","/uploads/products/product_img_1758640688957_cu0r5.webp","/uploads/products/product_img_1758640689038_kz1st.webp"]
16	Grateful Dead 70s	2850.00	4	/uploads/products/product_cover_1758640775790_gp7y5.webp	Tag: ป้ายจาง\r\nSize: อก 19.5 ยาว 23-24\r\nCondition: ตีเซอร์ ตำหนิตามรูป สีเสื้อสวยๆ ผ้า50 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-23 22:19:36.102675	active	2025-10-10 12:46:19.365278	[{"stock": 1, "chest_in": 19.5, "length_in": 24}]	["/uploads/products/product_img_1758640775862_8z9wi.webp","/uploads/products/product_img_1758640775926_xki7u.webp","/uploads/products/product_img_1758640775993_pdzgh.webp"]
17	Harley Davidson 80s	2500.00	3	/uploads/products/product_cover_1758640860860_zt523.webp	Tag: Sport-T\r\nSize: อก 21 ยาว 28.2\r\nCondition: 9/10 มี1รูปตามรูป คอสวย สกรีนสวยๆคมๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-23 22:21:01.242468	active	2025-09-28 16:55:38.133359	[{"size": null, "stock": 1, "chest_in": 21, "length_in": 28.2}]	["/uploads/products/product_img_1758640860918_y30gi.webp","/uploads/products/product_img_1758640860976_gvugs.webp","/uploads/products/product_img_1758640861054_czy1k.webp","/uploads/products/product_img_1758640861124_m811k.webp"]
14	ลายทหาร 80s	1500.00	2	/uploads/products/product_cover_1758640590155_n0xtf.webp	Tag: 3D Emblem\r\nSize: อก 18.5 ยาว 27.5\r\nCondition: ตีเซอร์ขอคนรับสภาพได้ครับ คอฟิต ผ้า50/50 แขนตัด-ชายเดี่ยว ตอกปี1987	1	2025-09-23 22:16:30.501146	active	2025-10-10 18:05:04.330565	[{"stock": 1, "chest_in": 18.5, "length_in": 27.5}]	["/uploads/products/product_img_1758640590219_spfol.webp","/uploads/products/product_img_1758640590304_kwir6.webp","/uploads/products/product_img_1758640590386_2l6gn.webp"]
18	Harley Davidson 80s	4000.00	3	/uploads/products/product_cover_1758640950860_sjxtk.webp	Tag: Harley Davidson\r\nSize: ระบุ L อก 20-20.3 ยาว 28.5 \r\nCondition: 9/10 มี1รูใต้รักแร้ขวา สีไม่เท่ากันนิดนึง(ตามรูป) เวลาใส่แถบไม่เห็น คอฟิตๆ สกรีนแตกร้าวตามกาลเวลา ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1989	1	2025-09-23 22:21:50.158578	active	2025-10-10 16:22:08.499212	[{"stock": 1, "chest_in": 20.3, "length_in": 28.5}]	["/uploads/products/product_img_1758640950649_2prza.webp","/uploads/products/product_img_1758640950735_i7exl.webp","/uploads/products/product_img_1758640950802_pkpzh.webp"]
11	Harley Davidson 80s	11500.00	3	/uploads/products/product_cover_1758640347666_b5ssb.webp	Tag: 3D EMBLEM\r\nSize: อก 18 ยาว 27.5\r\nCondition: 8.3/10 ตำหนิมีหลายชุนเก็บงานให้เนียนๆ มีรูเล็กๆตามรูป คอฟิต สกรีนสวยๆคมๆแห้งๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1987	1	2025-09-23 22:12:28.029668	active	2025-10-10 12:41:14.919563	[{"size": null, "stock": 1, "chest_in": 18, "length_in": 27.5}]	["/uploads/products/product_img_1758640347716_ka47r.webp","/uploads/products/product_img_1758640347777_qhbss.webp","/uploads/products/product_img_1758640347820_5wtnw.webp"]
35	Kurt	300.00	1	/uploads/products/product_cover_1759218659461_4qdg6.webp	Tag: H&M\r\nSize: อก 18 ยาว 26\r\nCondition: 9/10 ตำหนิตามรูป ตะเข็บคู่บน-ล่าง มีข้าง ผ้า100	1	2025-09-30 14:50:25.998185	active	2025-10-10 16:22:35.883278	[{"stock": 1, "chest_in": 18, "length_in": 26}]	["/uploads/products/product_img_1759218659332_kwn9z.webp","/uploads/products/product_img_1759218659394_2b4h9.webp"]
31	Scorpions 80s	3500.00	2	/uploads/products/product_cover_1759218294113_bfqho.webp	Tag: Handtex\r\nSize: ป้ายระบุ L อก 18.5 ยาว 25\r\nCondition: 9/10 ตำหนิมีรอยเย็บเกินจากโรงงาน มีรอยเปื้อนนิดหน่อย มีรู(ตามรูป) คอฟิต สกรีนคมๆ ผ้า50/50 แขนเดี่ยว-ชายปล่อย ตอกปี1988	1	2025-09-30 14:44:54.389209	active	2025-10-10 21:48:29.55288	[{"stock": 1, "chest_in": 18.5, "length_in": 25}]	["/uploads/products/product_img_1759218294154_35rgo.webp","/uploads/products/product_img_1759218294195_q1bjb.webp","/uploads/products/product_img_1759218294255_yqc5q.webp","/uploads/products/product_img_1759218294308_pk97k.webp"]
27	ผีถือปืน	1500.00	2	/uploads/products/product_cover_1759217892708_znr8j.webp	Tag: Thunder(sportswear)\r\nSize: อก 21 ยาว 26\r\nCondition: 8.5/10 ตำหนิตามรูป ผ้า100 แขนตัด-ชายคู่	1	2025-09-30 14:38:12.982179	active	2025-09-30 14:38:12.982179	[{"stock": 1, "chest_in": 21, "length_in": 26}]	["/uploads/products/product_img_1759217892751_pzt08.webp","/uploads/products/product_img_1759217892800_dk0uz.webp"]
25	Harley Davidson 80s	3500.00	3	/uploads/products/product_cover_1759217750347_p9u4d.webp	Tag: ป้ายร่วม3D\r\nSize: อก 22 ยาว 25\r\nCondition: 8/10 สภาพตามรูป เนื้อผ้ามันส์ๆ ผ้า50/50 ตะเข็บเดี่ยวล่าง-แขนตัด\r\nตอกปี1984	1	2025-09-30 14:35:50.619999	active	2025-10-06 23:04:18.792668	[{"stock": 1, "chest_in": 22, "length_in": 25}]	["/uploads/products/product_img_1759217750416_099fq.webp","/uploads/products/product_img_1759217750455_rtwut.webp","/uploads/products/product_img_1759217750514_exwel.webp"]
19	Harley Davidson 80s	3550.00	3	/uploads/products/product_cover_1758641034509_8mlr2.webp	Tag: Hanes\r\nSize: ป้ายระบุ L อก 19.3 ยาว 25.5\r\nCondition: 9/10 ไม่มีตำหนิ สีเฟดเสมอๆอย่างสวย สกรีนคมๆ ผ้า100เก่า ตะเข็บเดี่ยวบน-ล่าง ตอกปี1982	0	2025-09-23 22:23:54.849827	active	2025-10-10 20:12:17.101867	[{"size": null, "stock": 0, "chest_in": 19.3, "length_in": 25.5}]	["/uploads/products/product_img_1758641034562_vt8f8.webp","/uploads/products/product_img_1758641034613_rokwy.webp","/uploads/products/product_img_1758641034686_zdv9f.webp","/uploads/products/product_img_1758641034757_iulfg.webp"]
26	Harley Davidson 80s	4000.00	4	/uploads/products/product_cover_1759217835682_leu67.webp	Tag: ป้ายร่วม3D\r\nSize: อก 19.5 ยาว 27\r\nCondition: 9/10 ตำหนิตามรูป คอฟิต สกรีนแห้งๆรมๆ ผ้า50 แขนกุดเดิม-ชายเดี่ยว ตอกปี1984	1	2025-09-30 14:37:15.912997	active	2025-10-10 12:46:14.435907	[{"stock": 1, "chest_in": 19.5, "length_in": 27}]	["/uploads/products/product_img_1759217835718_17cl5.webp","/uploads/products/product_img_1759217835763_64k3q.webp","/uploads/products/product_img_1759217835817_z1l72.webp"]
20	Harley Davidson	2500.00	4	/uploads/products/product_cover_1758641145746_3gepj.webp	Tag: ป้ายขาวจางๆ\r\nSize: อก 18 ยาว 26.3\r\nCondition: 8.9/10 มีรู กับ แปะผ้ากาวให้แล้วเนียนๆ(ตามรูป) คอฟิต ผ้าเริ่มแตกเนื้อกำลังเฟด ผ้า50 ตะเข็บเดี่ยวบน-ล่าง ปีลึกต้น80s -ปลาย70s	0	2025-09-23 22:25:46.102203	active	2025-10-10 16:21:49.217949	[{"stock": 0, "chest_in": 18, "length_in": 26.3}]	["/uploads/products/product_img_1758641145808_8wmb6.webp","/uploads/products/product_img_1758641145855_0mlrv.webp","/uploads/products/product_img_1758641145914_dqepk.webp","/uploads/products/product_img_1758641145995_k4xs1.webp"]
28	Backroads 80s	2500.00	2	/uploads/products/product_cover_1759217983759_rq7h4.webp	Tag: 3D EMBLEM\r\nSize: อก 17.5 ยาว 26.7 \r\nCondition: 8.9/10 มี 2 รู(ตามรูป) คอฟิต สกรีนแห้งๆมีแตกร้าวตามกาลเวลา ผ้า50/50 สีเฟดสวยๆ ตะเข็บเดี่ยวบน-ล่าง ตอกปี1988	1	2025-09-30 14:39:43.931088	active	2025-10-09 17:41:02.252146	[{"stock": 1, "chest_in": 17.5, "length_in": 26.7}]	["/uploads/products/product_img_1759217983802_g5254.webp","/uploads/products/product_img_1759217983856_hsfew.webp"]
29	Harley Davidson	2500.00	3	/uploads/products/product_cover_1759218079183_tvb1k.webp	Tag: Hanes\r\nSize: ป้ายระบุ M อก 19 ยาว 27\r\nCondition: 9/10 มีสีด่าง(ตามรูป)ไม่มีผลต่อการสวมใส่ เวลาใส่แทบไม่เห็น คอฟิต สกรีนคมๆสวยๆ ผ้า100 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-30 14:41:19.371586	active	2025-10-10 01:13:07.087432	[{"stock": 1, "chest_in": 19, "length_in": 27}]	["/uploads/products/product_img_1759218079215_ad30i.webp","/uploads/products/product_img_1759218079246_lxhy8.webp","/uploads/products/product_img_1759218079295_kzib7.webp"]
39	Harley Davidson	1850.00	3	/uploads/products/product_cover_1759219556775_idu42.webp	ag: Harley Davidson\r\nSize: อก 21.3 ยาว 29\r\nCondition: 8.7/10 ตำหนิตามรูป สกรีนแห้งๆแตกร้าวตามกาลเวลา สีเสื้อเฟดสวยๆ ผ้า100 ตะเข็บคู่บน-ล่าง	1	2025-09-30 15:05:00.118443	active	2025-10-10 16:22:41.415402	[{"stock": 1, "chest_in": 21.3, "length_in": 29}]	["/uploads/products/product_img_1759219556581_lxj91.webp","/uploads/products/product_img_1759219556658_35scj.webp","/uploads/products/product_img_1759219556726_naz6l.webp"]
41	Bike Rally	700.00	3	/uploads/products/product_cover_1759219944548_fxv9x.webp	Tag: Delta\r\nSize: อก 24 ยาว 27\r\nCondition: 9/10 ไม่มีขาด-รู คอสวย สกรีนแห้งๆ ผ้า100 ตะเข็บคู่บน-ล่าง\r\n	0	2025-09-30 15:12:24.724256	active	2025-09-30 15:12:24.724256	[{"stock": 0, "chest_in": 24, "length_in": 27}]	["/uploads/products/product_img_1759219944594_gzos0.webp","/uploads/products/product_img_1759219944643_vf765.webp"]
43	Bustin Loose	1650.00	2	/uploads/products/product_cover_1759220154313_qxeig.webp	Tag: Hanes\r\nSize: M อก 18 ยาว 26\r\nCondition: 9/10 ไม่มีขาด-รู มีด้ายหลุดที่ชายล่าง(ตามรูป) คอสวย สกรีนคมๆ สีเสื้อเสมอทั้งตัว ผ้า100เก่า ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-30 15:15:54.543344	active	2025-09-30 15:15:54.543344	[{"stock": 1, "chest_in": 18, "length_in": 26}]	["/uploads/products/product_img_1759220154347_pj9jl.webp","/uploads/products/product_img_1759220154403_5nrwh.webp","/uploads/products/product_img_1759220154465_1ucmw.webp"]
44	Jack Daneil’s 80s	2500.00	2	/uploads/products/product_cover_1759220264367_9u0r5.webp	Tag: ป้ายบิน\r\nSize: อก 19.7 ยาว 28\r\nCondition: 8/10 ตำหนิตามรูป คอฟิต ผ้าเฟดมันส์ๆ โคตรสวย สกรีนแห้งๆคมๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-30 15:17:44.590476	active	2025-10-10 03:09:49.411661	[{"size": null, "stock": 1, "chest_in": 19.7, "length_in": 28}]	["/uploads/products/product_img_1759220264406_9fbi0.webp","/uploads/products/product_img_1759220264442_3c4tt.webp","/uploads/products/product_img_1759220264489_bxkmp.webp"]
42	CHEV 90s	250.00	2	/uploads/products/product_cover_1759220046693_ig6ja.webp	Tag: ป้ายขาวจางๆ\r\nSize: อก 19.5 ยาว 26.7\r\nCondition: 8/10 มีรอยเปื้อน กับรู(ตามรูป) คอไม่ฟิต สกรีนแห้งๆคมๆ ผ้า100 ตะเข็บเดี่ยวบน-ล่าง มีข้าง	1	2025-09-30 15:14:07.08201	active	2025-10-09 21:34:15.302191	[{"stock": 1, "chest_in": 19.5, "length_in": 26.7}]	["/uploads/products/product_img_1759220046744_viybc.webp","/uploads/products/product_img_1759220046790_r8yyn.webp","/uploads/products/product_img_1759220046831_xijyf.webp","/uploads/products/product_img_1759220046896_fl357.webp"]
40	Harley Davidson	1890.00	3	/uploads/products/product_cover_1759219850700_2znw0.webp	Tag: Harley Davidson\r\nSize: อก 23 ยาว 28.7\r\nCondition: 9/10 ไม่มีขาด-รู คอสวย สกรีนมีแตกร้าวเล็กน้อย ผ้า100 ตะเข็บคู่บน-ล่าง\r\n	1	2025-09-30 15:10:50.997388	active	2025-10-10 22:16:16.819937	[{"size": null, "stock": 1, "chest_in": 23, "length_in": 28.7}]	["/uploads/products/product_img_1759219850775_uy92s.webp","/uploads/products/product_img_1759219850844_ngp30.webp","/uploads/products/product_img_1759219850909_o59t7.webp"]
46	WILD LIFE 80s	1800.00	4	/uploads/products/product_cover_1759220514750_1zb5n.webp	Tag: ป้ายบิน\r\nSize: อก 18.5 ยาว 27.5\r\nCondition: 7/10 ตำหนิมีรอยเปื้อนสี+รูตามรูป คอฟิต ผ้า50 ตะเข็บเดี่ยวบน-ล่่าง	1	2025-09-30 15:21:55.061456	active	2025-10-10 21:39:50.75535	[{"stock": 1, "chest_in": 18.5, "length_in": 27.5}]	["/uploads/products/product_img_1759220514790_ar0p0.webp","/uploads/products/product_img_1759220514850_2d70l.webp","/uploads/products/product_img_1759220514919_znr38.webp","/uploads/products/product_img_1759220514973_w39sa.webp"]
38	Harley Davidson	1890.00	4	/uploads/products/product_cover_1759219133071_t20eo.webp	Tag: Harley Davidson\r\nSize: อก 23.7-24 ยาว 30.5\r\nCondition: 8.9/10 ตำหนิตามรูป ลายหลังเดือดๆ สีเสื้อดรอปกำลังสวย ผ้า50 ตะเข็บคู่บน-ล่าง	1	2025-09-30 14:58:53.533259	active	2025-10-10 22:15:42.158081	[{"stock": 1, "chest_in": 23.7, "length_in": 30.5}]	["/uploads/products/product_img_1759219133141_duw3r.webp","/uploads/products/product_img_1759219133216_v2nk2.webp","/uploads/products/product_img_1759219133302_iw8z6.webp"]
45	BearWhizBeer	2490.00	2	/uploads/products/product_cover_1759220355657_bg14a.webp	Tag: Alore\r\nSize: อก 20.5 ยาว 25.5\r\nCondition: 9/10 ไม่มีขาด-รู มีคลาบเปื้อนตามรูป เอาไปซักน่าจะออก คอสวย สกรีนแห้งๆคมๆ โดยรวมผ้าสีขาวๆสวยๆ ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง	1	2025-09-30 15:19:15.886176	active	2025-10-06 23:06:40.83743	[{"size": null, "stock": 1, "chest_in": 20.5, "length_in": 25.5}]	["/uploads/products/product_img_1759220355691_ttuof.webp","/uploads/products/product_img_1759220355738_v3fw6.webp","/uploads/products/product_img_1759220355800_smydq.webp"]
37	Harley Davidson	550.00	3	/uploads/products/product_cover_1759219005277_nwbu8.webp	Tag: Harley Davidson\r\nSize: อก 21.3 ยาว 27.7\r\nCondition: 8/10 ตำหนิตามรูป ผ้า100 ตะเข็บคู่บน-ล่าง\r\n	0	2025-09-30 14:56:45.635726	active	2025-10-10 20:34:15.273173	[{"stock": 0, "chest_in": 21.3, "length_in": 27.7}]	["/uploads/products/product_img_1759219005342_kplyj.webp","/uploads/products/product_img_1759219005391_u85er.webp","/uploads/products/product_img_1759219005450_ma4r2.webp","/uploads/products/product_img_1759219005524_8pkx2.webp"]
10	Harley Davidson 80s	3000.00	3	/uploads/products/product_cover_1758640218029_51ta4.webp	Tag: 3D EMBLEM\r\nSize: อก 19.7 ยาว 26.5\r\nCondition: 8.9/10 ตำหนิสีคอต่างจากตัวเสื้ิอ มีรู3รูเล็กๆตามรูป คอฟิต สกรีนสวยๆคมๆแห้งๆ แตกร้าวเล็กน้อยตามกาลเวลา ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1985	1	2025-09-23 22:10:18.418825	active	2025-10-06 23:04:00.566262	[{"stock": 1, "chest_in": 19.7, "length_in": 26.5}]	["/uploads/products/product_img_1758640218124_hhrrc.webp","/uploads/products/product_img_1758640218165_0600g.webp","/uploads/products/product_img_1758640218235_r2d3s.webp","/uploads/products/product_img_1758640218305_g7vo0.webp"]
30	Iron Maiden 80s	6900.00	1	/uploads/products/product_cover_1759218185713_afq8v.webp	Tag: Screen Stars\r\nSize:  อก 17.7 ยาว 25\r\nCondition: 9/10 มีรูเล็กๆตามรูป คอฟิต สกรีนสวยๆคมๆ ผ้า100เก่า ตะเข็บเดี่ยวบน-ล่าง ตอกปี1984	1	2025-09-30 14:43:05.94766	active	2025-10-10 01:11:35.399024	[{"stock": 1, "chest_in": 17.7, "length_in": 25}]	["/uploads/products/product_img_1759218185756_u85js.webp","/uploads/products/product_img_1759218185795_sj68i.webp","/uploads/products/product_img_1759218185858_mkczl.webp"]
32	Space jam 90s	790.00	2	/uploads/products/product_cover_1759218377777_wqwlz.webp	Tag: Pure\r\nSize: L อก 21.3 ยาว 28.5\r\nCondition: 9/10 ไม่มีขาด-รู คอฟิต สกรีนสวยคมๆ ผ้า100 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1996	1	2025-09-30 14:46:18.072363	active	2025-10-09 17:40:52.178732	[{"stock": 1, "chest_in": 21.3, "length_in": 28.5}]	["/uploads/products/product_img_1759218377821_5ln18.webp","/uploads/products/product_img_1759218377879_mo1vq.webp"]
4	Eric Clapton 90s	2590.00	1	/uploads/products/product_cover_1758550979895_payar.webp	Tag: Hanes\r\nSize: อก 23 ยาว 28.5\r\nCondition: 9/10 ไม่มีตำหนิ ตีกันพลาด1รู สกรีนแตกร้าวตามกาลเวลา ผ้า100 ตะเข็บเดี่ยวบน-ล่าง	0	2025-09-22 21:23:00.188172	active	2025-10-10 20:01:11.755503	[{"stock": 0, "chest_in": 23, "length_in": 28.5}]	["/uploads/products/product_img_1758550979950_esmjc.webp","/uploads/products/product_img_1758550980019_wbhur.webp","/uploads/products/product_img_1758550980084_5azup.webp"]
47	Snap on 80s	650.00	4	/uploads/products/product_cover_1759220586328_mk9sn.webp	Tag: ป้ายบิน\r\nSize: L อก 20.5 ยาว 26.3\r\nCondition: 8.5/10 ตำหนิมีคราบเปื้อนเล็กน้อยตามรูป สกรีนแห้งๆมีแตกร้าวตามกาลเวลา ผ้า50 แขนจั้ม-ชายเดี่ยว\r\n	1	2025-09-30 15:23:06.538702	active	2025-10-10 03:40:02.852325	[{"stock": 1, "chest_in": 20.5, "length_in": 26.3}]	["/uploads/products/product_img_1759220586361_ahy5g.webp","/uploads/products/product_img_1759220586411_6n8m2.webp","/uploads/products/product_img_1759220586469_niun0.webp"]
1	Harley Davidson 90s	5590.00	3	/uploads/products/product_cover_1758549603044_q16b0.webp	Tag: Harley Davidson\r\nSize: อก 20 ยาว 28\r\nCondition: 9/10 ตำหนิแปะผ้ากาวให้เนียนๆ1จุดตามรูป ตีกันพลาด1-2รู คอฟิต สกรีนแห้งๆคมๆ สีเสื้อดรอป1เบอร์ผ้า50/50 ตะเข็บเดี่ยวบน-ล่าง ตอกปี1991	1	2025-09-22 21:00:03.330358	active	2025-10-10 03:47:51.546559	[{"stock": 1, "chest_in": 20, "length_in": 28}]	["/uploads/products/product_img_1758550039416_ivfff.webp","/uploads/products/product_img_1758550046437_oh3f4.webp","/uploads/products/product_img_1758550052246_v9gyi.webp"]
\.


--
-- TOC entry 4946 (class 0 OID 16687)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, email, role, created_at, address, phone, profile_image, email_verified, province, district, subdistrict, zipcode) FROM stdin;
38	admin	$2b$10$MpttMAukMNPCGJz9s8xqkeUcoFfA9pQAzP9LBzzLQ9S8m7C.goW1y	thirawat2547tae@gmail.com	admin	2025-09-02 14:26:22.292516	หมู่บ้านวรารักษ์ฺ 100/275 ซอย5	0988840518	/uploads/profile/profile_1759049858022.webp	t	พระนครศรีอยุธยา	วังน้อย	ลำตาเสา	13170
78	ถิรวัฒน์ วิธิสินธุ์	$2b$10$vRgBRxIjUpXA2TWsYdN4vuuVtTikUQmOEybdBsvXe67d4VYV0R6Uq	46719@ayw.ac.th	user	2025-10-09 17:44:22.295231	เเพร่กาญ 12\n	0988405158	/uploads/profile/profile_1760007459531.webp	t	เชียงราย	เวียงชัย	เวียงชัย	57210
62	นายถิรวัฒน์ ณ ลำปาง	$2b$10$XE2ZuK0HrB0wDOBZ9N0QKOWBDDNW..p.TSaltmEVRF5c/wHKYCkYG	taerevv07@gmail.com	user	2025-09-06 23:39:23.481817	100/275 หมู่บ้านวรารักษ์	0988405158	/uploads/profile/profile_1758827844171.webp	t	พระนครศรีอยุธยา	วังน้อย	ลำตาเสา	13170
80	ถิรวัฒน์ ณ ลำปาง	$2b$10$slmI0T8MAshpPRpEHmtDfu/5Ieozn0SfrGAZr3OP196xfhhZKUDRi	thirawatnalampang@gmail.com	user	2025-10-10 02:04:21.952319	100/275 หมู่บ้านวรารักษ์	0988405158	/uploads/profile/profile_1760036677296.webp	t	พระนครศรีอยุธยา	วังน้อย	ลำตาเสา	13170
68	สมพร วิธิสิทธุ์	$2b$10$WGDcxo6SVfTXgFOqnFwqWOXrLtx2dl9J64jy9Zt.gXRzvIA8DyYru	thirawat.na@ku.th	user	2025-09-07 13:22:28.031031	บ้านลำปาง	0575767567	/uploads/profile/profile_1758546348662.webp	t	มุกดาหาร	คำชะอี	โพนงาม	49110
69	ปวีณา สส	$2b$10$UT41uEcVLi0M94Nlxe38Q.KbCedmZDOcOoyHjG4cDvs0ibrhE/Waa	projecthalf2@gmail.com	user	2025-09-08 03:56:51.333611	หมู่13	0898264296	/uploads/profile/profile_1759055114043.webp	t	ตราด	เกาะกูด	เกาะกูด	23000
\.


--
-- TOC entry 4965 (class 0 OID 0)
-- Dependencies: 219
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 4, true);


--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 223
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 72, true);


--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 225
-- Name: orders_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq1', 67, true);


--
-- TOC entry 4968 (class 0 OID 0)
-- Dependencies: 221
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 52, true);


--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 217
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 80, true);


--
-- TOC entry 4785 (class 2606 OID 16709)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 4788 (class 2606 OID 16707)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4792 (class 2606 OID 16746)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4794 (class 2606 OID 18209)
-- Name: orders orders_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey1 PRIMARY KEY (id);


--
-- TOC entry 4790 (class 2606 OID 16720)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4778 (class 2606 OID 16700)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4781 (class 2606 OID 16696)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4783 (class 2606 OID 16698)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4786 (class 1259 OID 17385)
-- Name: categories_name_lower_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_name_lower_key ON public.categories USING btree (lower((name)::text));


--
-- TOC entry 4779 (class 1259 OID 17250)
-- Name: users_email_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_uidx ON public.users USING btree (email);


--
-- TOC entry 4799 (class 2620 OID 18236)
-- Name: orders trg_set_updated_at_orders; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4796 (class 2606 OID 18210)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4797 (class 2606 OID 18238)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4798 (class 2606 OID 18337)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4795 (class 2606 OID 16721)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


-- Completed on 2025-10-10 23:37:38

--
-- PostgreSQL database dump complete
--

