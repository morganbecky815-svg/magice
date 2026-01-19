// utils/ticketAnalytics.js
class TicketAnalytics {
    static async getTicketStats() {
        const stats = await Ticket.aggregate([
            {
                $facet: {
                    // Status counts
                    statusCounts: [
                        { $group: { _id: "$status", count: { $sum: 1 } } }
                    ],
                    // Category counts
                    categoryCounts: [
                        { $group: { _id: "$category", count: { $sum: 1 } } }
                    ],
                    // Daily tickets
                    dailyTickets: [
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: -1 } },
                        { $limit: 30 }
                    ],
                    // Average resolution time
                    avgResolutionTime: [
                        { $match: { resolvedAt: { $exists: true } } },
                        {
                            $project: {
                                resolutionTime: { $subtract: ["$resolvedAt", "$createdAt"] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                avgTime: { $avg: "$resolutionTime" }
                            }
                        }
                    ]
                }
            }
        ]);
        
        return stats[0];
    }
}