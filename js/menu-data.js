/* ============================================================
   SPICE & EMBER — MENU DATA
   ============================================================ */

const MENU_DATA = [
  // ===== STARTERS =====
  { id:'st-001', name:'Fire-Roasted Shrimp', description:'Jumbo shrimp charred over open flame, finished with chili-garlic butter and fresh lime.', price:14.99, category:'starters', image:'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=600&h=450&fit=crop', rating:4.8, reviews:124, type:'non-veg', spicy:2, featured:true, popular:true },
  { id:'st-002', name:'Ember-Roasted Bone Marrow', description:'Beef bone marrow roasted with herbs, served with toasted sourdough and pickled shallots.', price:18.99, category:'starters', image:'https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?w=600&h=450&fit=crop', rating:4.9, reviews:89, type:'non-veg', spicy:1, featured:true, popular:true },
  { id:'st-003', name:'Charred Octopus', description:'Tender octopus grilled over charcoal, with smoked paprika aioli and pickled fennel.', price:16.99, category:'starters', image:'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=450&fit=crop', rating:4.7, reviews:67, type:'non-veg', spicy:1, featured:false, popular:true },
  { id:'st-004', name:'Smoked Tomato Soup', description:'Fire-roasted tomatoes slow-smoked with basil, finished with truffle oil.', price:9.99, category:'starters', image:'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=450&fit=crop', rating:4.5, reviews:92, type:'veg', spicy:1, featured:false, popular:false },
  { id:'st-005', name:'Crispy Calamari', description:'Flash-fried calamari dusted with smoked paprika, served with chipotle aioli.', price:12.99, category:'starters', image:'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=600&h=450&fit=crop', rating:4.6, reviews:156, type:'non-veg', spicy:2, featured:false, popular:true },
  { id:'st-006', name:'Flame-Grilled Halloumi', description:'Halloumi cheese grilled until golden, drizzled with honey and za\u2019atar spice.', price:11.99, category:'starters', image:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=450&fit=crop', rating:4.4, reviews:78, type:'veg', spicy:0, featured:false, popular:false },

  // ===== MAINS =====
  { id:'mc-001', name:'Smoked Brisket', description:'12-hour oak-smoked brisket with house BBQ rub, served with pickled slaw and cornbread.', price:28.99, category:'mains', image:'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=450&fit=crop', rating:4.9, reviews:234, type:'non-veg', spicy:2, featured:true, popular:true },
  { id:'mc-002', name:'Charcoal-Grilled Ribeye', description:'14oz prime ribeye seared over mesquite charcoal, with roasted bone marrow butter.', price:38.99, category:'mains', image:'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=450&fit=crop', rating:4.9, reviews:312, type:'non-veg', spicy:1, featured:true, popular:true },
  { id:'mc-003', name:'Fire-Roasted Salmon', description:'Atlantic salmon fillet roasted over cedar plank, with citrus-herb butter and asparagus.', price:26.99, category:'mains', image:'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=450&fit=crop', rating:4.7, reviews:178, type:'non-veg', spicy:1, featured:true, popular:true },
  { id:'mc-004', name:'Ember-Roasted Chicken', description:'Half chicken marinated in yogurt & spices, roasted over embers until golden and juicy.', price:22.99, category:'mains', image:'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&h=450&fit=crop', rating:4.6, reviews:198, type:'non-veg', spicy:2, featured:false, popular:true },
  { id:'mc-005', name:'Wild Mushroom Stroganoff', description:'Mixed wild mushrooms in a smoked paprika cream sauce over herbed pappardelle.', price:19.99, category:'mains', image:'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=450&fit=crop', rating:4.5, reviews:134, type:'veg', spicy:1, featured:false, popular:false },
  { id:'mc-006', name:'Lamb Kofta Kebab', description:'Spiced ground lamb skewers grilled over charcoal, with tzatziki and warm flatbread.', price:24.99, category:'mains', image:'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&h=450&fit=crop', rating:4.8, reviews:156, type:'non-veg', spicy:3, featured:false, popular:true },
  { id:'mc-007', name:'Grilled Eggplant Steak', description:'Thick-cut eggplant charred with miso glaze, sesame, and scallions over forbidden rice.', price:17.99, category:'mains', image:'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&h=450&fit=crop', rating:4.4, reviews:89, type:'veg', spicy:1, featured:false, popular:false },
  { id:'mc-008', name:'Spiced Duck Breast', description:'Crispy-skinned duck breast with cherry-chipotle glaze and roasted root vegetables.', price:32.99, category:'mains', image:'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600&h=450&fit=crop', rating:4.8, reviews:112, type:'non-veg', spicy:2, featured:true, popular:false },

  // ===== GRILLS =====
  { id:'gr-001', name:'Tomahawk Steak', description:'Bone-in tomahawk dry-aged 28 days, fire-seared and basted with smoked garlic butter.', price:54.99, category:'grills', image:'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=450&fit=crop', rating:5.0, reviews:204, type:'non-veg', spicy:1, featured:true, popular:true },
  { id:'gr-002', name:'Mixed Grill Platter', description:'Ribeye, lamb kofta, chicken tikka and sausage, flame-grilled and served on cast iron.', price:42.99, category:'grills', image:'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=450&fit=crop', rating:4.8, reviews:167, type:'non-veg', spicy:2, featured:false, popular:true },
  { id:'gr-003', name:'Tandoori Cauliflower', description:'Whole cauliflower marinated in spiced yogurt, charred in the tandoor, mint chutney.', price:16.99, category:'grills', image:'https://images.unsplash.com/photo-1601314167099-232775b3d6cc?w=600&h=450&fit=crop', rating:4.6, reviews:98, type:'veg', spicy:2, featured:false, popular:false },

  // ===== SIDES =====
  { id:'sd-001', name:'Truffle Fries', description:'Crispy fries tossed with truffle oil, parmesan, and fresh herbs.', price:8.99, category:'sides', image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=450&fit=crop', rating:4.7, reviews:267, type:'veg', spicy:0, featured:false, popular:true },
  { id:'sd-002', name:'Smoked Mac & Cheese', description:'Three-cheese blend with smoked gouda, topped with crispy breadcrumbs.', price:9.99, category:'sides', image:'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=600&h=450&fit=crop', rating:4.6, reviews:198, type:'veg', spicy:0, featured:false, popular:true },
  { id:'sd-003', name:'Charred Broccolini', description:'Broccolini charred with garlic, chili flakes, and lemon.', price:7.99, category:'sides', image:'https://images.unsplash.com/photo-1510627489930-0c1b0bfb6785?w=600&h=450&fit=crop', rating:4.3, reviews:87, type:'veg', spicy:1, featured:false, popular:false },
  { id:'sd-004', name:'Corn & Jalape\u00f1o Elote', description:'Fire-roasted corn with crema, cotija cheese, lime, and jalape\u00f1o.', price:8.49, category:'sides', image:'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&h=450&fit=crop', rating:4.5, reviews:134, type:'veg', spicy:2, featured:false, popular:true },

  // ===== DESSERTS =====
  { id:'ds-001', name:'Smoked Chocolate Lava Cake', description:'Warm dark chocolate cake with a molten center, smoked with hickory and vanilla ice cream.', price:11.99, category:'desserts', image:'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=450&fit=crop', rating:4.9, reviews:212, type:'veg', spicy:0, featured:true, popular:true },
  { id:'ds-002', name:'Fire-Toasted S\u2019mores', description:'House-made graham cracker, torched marshmallow, and dark chocolate ganache.', price:9.99, category:'desserts', image:'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=450&fit=crop', rating:4.7, reviews:156, type:'veg', spicy:0, featured:false, popular:true },
  { id:'ds-003', name:'Grilled Peach & Honey', description:'Caramelized peaches with honey, mascarpone, and toasted almonds.', price:10.99, category:'desserts', image:'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=450&fit=crop', rating:4.6, reviews:98, type:'veg', spicy:0, featured:false, popular:false },
  { id:'ds-004', name:'Ember-Baked Cheesecake', description:'Creamy New York cheesecake with a burnt honey top and berry compote.', price:10.99, category:'desserts', image:'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&h=450&fit=crop', rating:4.8, reviews:145, type:'veg', spicy:0, featured:false, popular:true },

  // ===== BEVERAGES =====
  { id:'bv-001', name:'Smoked Old Fashioned', description:'Bourbon, smoked maple syrup, bitters, and orange peel \u2014 tableside smoked.', price:16.99, category:'beverages', image:'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=450&fit=crop', rating:4.8, reviews:178, type:'veg', spicy:0, featured:true, popular:true },
  { id:'bv-002', name:'Fire-Roasted Lemonade', description:'Fresh lemonade with fire-roasted lemons, rosemary, and a hint of honey.', price:5.99, category:'beverages', image:'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=450&fit=crop', rating:4.5, reviews:123, type:'veg', spicy:0, featured:false, popular:true },
  { id:'bv-003', name:'Charcoal Latte', description:'Espresso with activated charcoal, steamed oat milk, and a touch of vanilla.', price:6.99, category:'beverages', image:'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=450&fit=crop', rating:4.3, reviews:89, type:'veg', spicy:0, featured:false, popular:false },
  { id:'bv-004', name:'Spiced Chai Ember', description:'House-made chai with cinnamon, cardamom, star anise, and a smoked honey rim.', price:5.99, category:'beverages', image:'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=450&fit=crop', rating:4.6, reviews:112, type:'veg', spicy:0, featured:false, popular:true },
  { id:'bv-005', name:'Ember Mule', description:'Vodka, ginger beer, lime, and a smoked chili rim.', price:14.99, category:'beverages', image:'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=450&fit=crop', rating:4.7, reviews:134, type:'veg', spicy:1, featured:false, popular:true }
];

const CATEGORY_LABELS = {
  all:'All', starters:'Starters', mains:'Mains', grills:'Grills',
  sides:'Sides', desserts:'Desserts', beverages:'Drinks'
};

const MenuData = {
  _custom: [],
  async loadCustom() {
    try {
      this._custom = (typeof API !== 'undefined' && API.getMenuItems)
        ? await API.getMenuItems()
        : (Utils.getFromStorage(CONFIG.customMenuKey) || []);
    } catch (e) {
      this._custom = Utils.getFromStorage(CONFIG.customMenuKey) || [];
    }
    return this._custom;
  },
  getAll() {
    return [...MENU_DATA, ...(this._custom || [])];
  },
  getById(id) { return this.getAll().find(i => i.id === id); },
  getByCategory(c) { return (!c || c === 'all') ? this.getAll() : this.getAll().filter(i => i.category === c); },
  getCategories() { return ['all', ...new Set(this.getAll().map(i => i.category))]; },
  getFeatured() { return this.getAll().filter(i => i.featured); },
  getPopular() { return this.getAll().filter(i => i.popular); },
  search(q) {
    const s = (q || '').toLowerCase().trim();
    if (!s) return this.getAll();
    return this.getAll().filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.description.toLowerCase().includes(s) ||
      i.category.toLowerCase().includes(s));
  },
  filter({ category, type, maxPrice, minRating, sortBy, search } = {}) {
    let r = this.search(search);
    if (category && category !== 'all') r = r.filter(i => i.category === category);
    if (type) r = r.filter(i => i.type === type);
    if (maxPrice) r = r.filter(i => i.price <= maxPrice);
    if (minRating) r = r.filter(i => i.rating >= minRating);
    if (sortBy) {
      const s = { 'price-low':(a,b)=>a.price-b.price, 'price-high':(a,b)=>b.price-a.price,
        rating:(a,b)=>b.rating-a.rating, popular:(a,b)=>b.reviews-a.reviews,
        name:(a,b)=>a.name.localeCompare(b.name) };
      if (s[sortBy]) r = [...r].sort(s[sortBy]);
    }
    return r;
  }
};
