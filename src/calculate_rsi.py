def calculate_rsi(prices, window=14):
    """
    计算相对强弱指标（RSI）
    
    参数:
        prices (list): 股价列表（按时间顺序排列，最近的价格在最后）
        window (int): 计算窗口（默认为14天）
    
    返回:
        list: RSI值列表（前window-1个为None，之后为RSI值）
    """
    if len(prices) < window:
        return [None] * len(prices)
    
    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
    
    # 初始化增益和损失列表
    gains = []
    losses = []
    for d in deltas:
        gains.append(max(d, 0))
        losses.append(max(-d, 0))
    
    # 初始化RSI列表
    rsi = [None] * (window - 1)
    
    # 计算第一个RSI值
    avg_gain = sum(gains[:window]) / window
    avg_loss = sum(losses[:window]) / window or 1e-10  # 避免除零错误
    
    rs = avg_gain / avg_loss
    first_rsi = 100 - (100 / (1 + rs))
    rsi.append(first_rsi)
    
    # 计算后续的RSI值
    for i in range(window, len(deltas)):
        avg_gain = (avg_gain * (window - 1) + gains[i]) / window
        avg_loss = (avg_loss * (window - 1) + losses[i]) / window or 1e-10
        
        rs = avg_gain / avg_loss
        current_rsi = 100 - (100 / (1 + rs))
        rsi.append(current_rsi)
    
    # 返回与输入长度相同的列表（前面填充None）
    return [None] * 1 + rsi  # 第一天的delta不存在，因此补一个None
