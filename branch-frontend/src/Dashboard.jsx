import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList // FIX: Import LabelList
} from 'recharts';

// --- STYLING & HELPERS ---
const COLORS_PANELS = {
  tnps: '#1565c0',
  responders: '#607d8b',
  promoters: '#388e3c',
  neutral: '#ffb300',
  detractors: '#d32f2f'
};
const PIE_COLORS = ['#4CAF50', '#FFC107', '#F44336']; // Green, Amber, Red for Pie Chart
const FONT_FAMILY = '"Inter", "Segoe UI", "Roboto", Arial, sans-serif';

// Helper function to format date to DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

// Function to get appropriate emoji for rating buttons
const getRatingEmoji = (rating) => {
    if (rating === 0) return '😡';
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😞';
    if (rating === 4) return '😐';
    if (rating === 5) return '😕';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '😄';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
};


const Dashboard = ({
  userData, API_BASE_URL, isLoading, error, successMessage,
  setIsLoading, setError, setSuccessMessage,
  filteredClients,
  fetchClientsForBranchAdminFilters,
}) => {
  // Filter states
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Data
  const [reviews, setReviews] = useState([]);
  const [ratingDistributionData, setRatingDistributionData] = useState([]);
  const [feedbackTypeData, setFeedbackTypeData] = useState([]);
  const [reviewsOverTimeData, setReviewsOverTimeData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Stats
  const [responders, setResponders] = useState(0);
  const [promoters, setPromoters] = useState({ count: 0, pct: 0 });
  const [detractors, setDetractors] = useState({ count: 0, pct: 0 });
  const [neutral, setNeutral] = useState({ count: 0, pct: 0 });
  const [tnps, setTnps] = useState(0);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // Fetch reviews for the branch admin scope
  const fetchBranchReviews = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/branch/reviews?`;
      if (filterClientId) url += `clientId=${filterClientId}&`;
      if (filterStartDate) url += `startDate=${filterStartDate}&`;
      if (filterEndDate) url += `endDate=${filterEndDate}&`;

      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = await response.json();
      if (response.ok) {
        setReviews(data);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
        setReviews([]);
      }
    } catch (err) {
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, filterClientId, filterStartDate, filterEndDate, getAuthHeaders, setIsLoading, setError]);

  // Effect to trigger review fetching
  useEffect(() => {
    if (userData?.token && userData?.branchId) {
      fetchBranchReviews();
      fetchClientsForBranchAdminFilters();
    }
  }, [filterClientId, filterStartDate, filterEndDate, userData, fetchBranchReviews, fetchClientsForBranchAdminFilters]);

  // Process reviews data for charts and statistics
  useEffect(() => {
    if (!reviews || reviews.length === 0) {
      setResponders(0); setPromoters({ count: 0, pct: 0 }); setDetractors({ count: 0, pct: 0 });
      setNeutral({ count: 0, pct: 0 }); setTnps(0); setAverageRating(0); setTotalReviews(0);
      setRatingDistributionData([]); setFeedbackTypeData([]); setReviewsOverTimeData([]);
      return;
    }

    const total = reviews.length;
    setTotalReviews(total);

    // FIX: Update calculations to include 0 rating
    const promotersCount = reviews.filter(r => r.rating === 9 || r.rating === 10).length;
    const detractorsCount = reviews.filter(r => r.rating >= 0 && r.rating <= 6).length;
    const neutralCount = reviews.filter(r => r.rating === 7 || r.rating === 8).length;

    setResponders(total);
    setPromoters({ count: promotersCount, pct: total ? ((promotersCount / total) * 100).toFixed(1) : 0 });
    setDetractors({ count: detractorsCount, pct: total ? ((detractorsCount / total) * 100).toFixed(1) : 0 });
    setNeutral({ count: neutralCount, pct: total ? ((neutralCount / total) * 100).toFixed(1) : 0 });
    setTnps(total ? ((promotersCount - detractorsCount) / total * 100).toFixed(1) : 0);

    const ratingCounts = {};
    let totalRatingSum = 0;
    reviews.forEach(review => {
      ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
      totalRatingSum += review.rating;
    });

    // FIX: Generate bar chart data for ratings 0-10
    const processedRatingData = Array.from({ length: 11 }, (_, i) => i).map(rating => ({
      rating: rating,
      count: ratingCounts[rating] || 0,
    }));
    setRatingDistributionData(processedRatingData);
    setAverageRating(total ? (totalRatingSum / total).toFixed(2) : 0);
    
    const feedbackCounts = {
        positive: promotersCount,
        neutral: neutralCount,
        negative: detractorsCount,
    };

    const processedFeedbackTypeData = Object.keys(feedbackCounts).map(type => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: feedbackCounts[type],
    })).filter(item => item.value > 0);
    setFeedbackTypeData(processedFeedbackTypeData);

    const dailyReviewCounts = {};
    reviews.forEach(review => {
      const date = new Date(review.createdAt).toLocaleDateString('en-CA');
      dailyReviewCounts[date] = (dailyReviewCounts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyReviewCounts).sort();
    const processedReviewsOverTimeData = sortedDates.map(date => ({
      date: date,
      count: dailyReviewCounts[date],
    }));
    setReviewsOverTimeData(processedReviewsOverTimeData);

  }, [reviews]);

  // --- STYLES ---
  const statsPanelStyle = {
    display: "flex", gap: "17px", margin: "32px 0 36px 0", flexWrap: "wrap"
  };
  const statCard = color => ({
    flex: '1 1 190px', minWidth: 190, background: "#fff",
    borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    textAlign: "center", padding: "22px 9px 14px 9px", borderTop: `5px solid ${color}`, fontFamily: FONT_FAMILY
  });
  const cardHeading = color => ({
    fontWeight: 800, fontSize: "17.5px", marginBottom: "10px", color,
    letterSpacing: '.2px', fontFamily: FONT_FAMILY
  });
  const cardValue = color => ({
    fontSize: 33, color, fontWeight: 900, letterSpacing: ".3px"
  });

  return (
    <div className="w-full p-8 rounded-2xl shadow-lg border border-gray-200 mx-auto font-sans bg-gray-100">
      {/* FILTER PANEL */}
      <div style={{
        background: "#f3e5f5", borderRadius: 13, padding: '18px 15px 12px 15px',
        marginBottom: 18, boxShadow: '0 2px 12px #ab47bc11', border: "1.4px solid #ce93d8", maxWidth: '100%'
      }}>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 15, color: "#4a148c", letterSpacing: "1.2px" }}>
          Dashboard Overview
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
          <div>
            <label style={{ fontWeight: 600, color: "#8e24aa" }}>Client:</label>
            <select style={{
              marginLeft: 5, minWidth: 125, padding: "7px 9px",
              background: "#fdf8ff", borderRadius: 5, border: "1.1px solid #e1bee7", fontWeight: 500
            }}
              value={filterClientId} onChange={e => setFilterClientId(e.target.value)}
              disabled={filteredClients.length === 0}>
              <option value="">All Clients</option>
              {filteredClients?.map(cl => <option key={cl._id} value={cl._id}>{cl.email}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#ffa000" }}>From:</label>
            <input type="date" style={{
              marginLeft: 4, padding: "8px", borderRadius: 6,
              background: "#fffde7", border: "1.1px solid #ffd600", fontWeight: 500
            }} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#d84315" }}>To:</label>
            <input type="date" style={{
              marginLeft: 4, padding: "8px", borderRadius: 6,
              background: "#ffebee", border: "1.1px solid #ef9a9a", fontWeight: 500
            }} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* STATISTICS PANEL */}
      <div style={statsPanelStyle}>
        <div style={statCard(COLORS_PANELS.tnps)}>
          <div style={cardHeading(COLORS_PANELS.tnps)}>Service TNPS</div>
          <div style={cardValue(COLORS_PANELS.tnps)}>{tnps}</div>
          <div style={{ fontWeight: 500, color: '#1976d2', fontSize: 13, opacity: 0.8, marginTop: 2 }}>
            (Promoters% – Detractors%)
          </div>
        </div>
        <div style={statCard(COLORS_PANELS.responders)}>
          <div style={cardHeading(COLORS_PANELS.responders)}>Responders</div>
          <div style={cardValue(COLORS_PANELS.responders)}>{responders}</div>
        </div>
        <div style={statCard(COLORS_PANELS.promoters)}>
          <div style={cardHeading(COLORS_PANELS.promoters)}>Promoters %</div>
          <div style={cardValue(COLORS_PANELS.promoters)}>
            {promoters.pct}%<sup style={{ fontSize: 15, color: "#252F47", marginLeft: 4 }}>{promoters.count}</sup>
          </div>
          <div style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>TNPS 9–10</div>
        </div>
        <div style={statCard(COLORS_PANELS.detractors)}>
          <div style={cardHeading(COLORS_PANELS.detractors)}>Detractors %</div>
          <div style={cardValue(COLORS_PANELS.detractors)}>
            {detractors.pct}%<sup style={{ fontSize: 15, color: "#7f1138", marginLeft: 4 }}>{detractors.count}</sup>
          </div>
          <div style={{ fontSize: 13, color: '#d32f2f', fontWeight: 600 }}>TNPS 0–6</div> {/* FIX: Label updated */}
        </div>
        <div style={statCard(COLORS_PANELS.neutral)}>
          <div style={cardHeading(COLORS_PANELS.neutral)}>Passives %</div>
          <div style={cardValue(COLORS_PANELS.neutral)}>
            {neutral.pct}%<sup style={{ fontSize: 15, color: "#178d57", marginLeft: 4 }}>{neutral.count}</sup>
          </div>
          <div style={{ fontSize: 13, color: '#ffb300', fontWeight: 600 }}>TNPS 7–8</div>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: "flex", gap: 34, alignItems: "stretch", flexWrap: "wrap", justifyContent: "space-between", maxWidth: '100%' }}>
        <div style={{
          flex: "3", minWidth: 350, background: "#fff", borderRadius: 15, padding: "17px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: COLORS_PANELS.tnps, letterSpacing: ".2px" }}>
            Ratings Distribution (0–10) {/* FIX: Title updated */}
          </div>
          <ResponsiveContainer width="100%" height={246}>
            <BarChart data={ratingDistributionData}>
              <XAxis dataKey="rating" tick={{ fontWeight: 'bold', fill: COLORS_PANELS.tnps, fontSize: 15 }} />
              <YAxis allowDecimals={false} tick={{ fontWeight: 'bold', fill: '#222', fontSize: 15 }} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS_PANELS.promoters} radius={[8, 8, 0, 0]}>
                <LabelList dataKey="count" position="top" style={{ fill: '#374151', fontWeight: 'bold' }} /> {/* FIX: Labels added */}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{
          flex: "2", minWidth: 270, background: "#fff", borderRadius: 15, padding: "18px 8px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative"
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 13, color: "#607d8b", letterSpacing: ".2px" }}>
            Review Breakdown
          </div>
          <ResponsiveContainer width="99%" height={238}>
            <PieChart>
              <Pie data={feedbackTypeData} cx="50%" cy="50%" labelLine={false}
                label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                {feedbackTypeData.map((e, idx) =>
                  <Cell key={e.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                )}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= REVIEW TABLE SECTION (REWRITTEN) ================ */}
      <div style={{ margin: "50px 0 30px 0", fontSize: 20, color: "#8e24aa", fontWeight: 800, paddingTop: 25 }}>
        All Reviews ({reviews.length})
      </div>
      <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Card</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice File</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transcribed Text</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Audio</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reviews.map((review) => (
              <tr key={review._id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{review.customerName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.customerMobile || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.client?.email || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.invoiceData?.vin || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.invoiceData?.jobCardNumber || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.invoiceData?.invoiceNumber || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.invoiceData?.invoiceDate ? formatDate(review.invoiceData.invoiceDate) : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  {review.invoiceFileUrl ? (<a href={review.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">View File</a>) : ('N/A')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  <div className="h-24 w-96 overflow-y-auto whitespace-normal break-words">
                    {review.transcribedText || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{review.createdAt ? formatDate(review.createdAt) : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-lg font-medium text-gray-900">
                  {review.rating ?? 'N/A'} <span className="text-2xl">{getRatingEmoji(review.rating)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {review.voiceData ? (<audio controls src={review.voiceData} className="w-full max-w-[250px] h-10 rounded-lg"></audio>) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ color: COLORS_PANELS.detractors, margin: "19px 0", fontWeight: 600, fontSize: 15.5 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
