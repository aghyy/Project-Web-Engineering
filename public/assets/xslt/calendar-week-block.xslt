<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <xsl:apply-templates select="//lesson"/>
  </xsl:template>
  
  <!-- key for finding overlaps -->
  <xsl:key name="lessons-by-day" match="lesson" use="ancestor::day/@id"/>
  
  <xsl:template match="lesson">
    <xsl:variable name="day" select="../@id"/>
    <xsl:variable name="begin" select="begin"/>
    <xsl:variable name="end" select="end"/>
    
    <xsl:variable name="current-lesson" select="."/>
    <xsl:variable name="begin-minutes" select="substring-before($begin, '_') * 60 + substring-after($begin, '_')"/>
    <xsl:variable name="end-minutes" select="substring-before($end, '_') * 60 + substring-after($end, '_')"/>
    
    <!-- overlap condition -->
    <xsl:variable name="overlap" select="
      count(key('lessons-by-day', $day)[
          . != $current-lesson and 
          not(substring-before(begin, '_') * 60 + substring-after(begin, '_') &gt;= $end-minutes or
            substring-before(end, '_') * 60 + substring-after(end, '_') &lt;= $begin-minutes)
        ]) > 0"/>
    
    <!-- overlap style -->  
    <xsl:variable name="position-style">
      <xsl:choose>
        <xsl:when test="$overlap and position() mod 2 = 1">
          <xsl:text>left: 0; width: 40%;</xsl:text>
        </xsl:when>
        <xsl:when test="$overlap and position() mod 2 = 0">
          <xsl:text>right: 0; width: 40%; margin:0px 10px 0px 0px;</xsl:text>
        </xsl:when>
        <!-- <xsl:otherwise>
             <xsl:text>width: 95%;</xsl:text>
             </xsl:otherwise> -->
         </xsl:choose>
    </xsl:variable>
    
    <li class="event">
      <xsl:attribute name="style">
        <xsl:text>grid-column: </xsl:text>
        <xsl:value-of select="$day"/>
        <xsl:text>; grid-row: h</xsl:text>
        <xsl:value-of select="$begin"/>
        <xsl:text> / h</xsl:text>
        <xsl:value-of select="$end"/>
        <xsl:text>;</xsl:text>
        
        <xsl:choose>
          <xsl:when test="exam='true'">
            <xsl:text> background-color: var(--red);</xsl:text>
          </xsl:when>
          <xsl:when test="holiday='true'">
            <xsl:text> background-color: var(--green);</xsl:text>
          </xsl:when>
          <xsl:when test="lecture='true'">
            <xsl:text> background-color: var(--lecture-event);</xsl:text>
          </xsl:when>
          <xsl:when test="other_event='true'">
            <xsl:text> background-color: var(--other-event);</xsl:text>
          </xsl:when>
          <xsl:when test="voluntary='true'">
            <xsl:text> background-color: var(--volunt-event);</xsl:text>
          </xsl:when>
        </xsl:choose>
        
        <!-- apply overlap style -->
        <xsl:value-of select="$position-style"/>
        
      </xsl:attribute>
      
      <h3><xsl:value-of select="name"/></h3>      
      <xsl:choose>
        <xsl:when test="holiday='false'">
          <p>
            <xsl:call-template name="newline-to-br">
              <xsl:with-param name="text" select="person"/>
            </xsl:call-template>
          </p>
          
          <br />
          
          <p>
            <xsl:call-template name="newline-to-br">
              <xsl:with-param name="text" select="room"/>
            </xsl:call-template>
          </p>
          
          <br />
          
          <p>Dauer: <xsl:value-of select="total_time"/></p>
          <p>
            <xsl:value-of select="substring($begin, 1, 2)"/>:<xsl:value-of select="substring($begin, 4)"/> - 
            <xsl:value-of select="substring($end, 1, 2)"/>:<xsl:value-of select="substring($end, 4)"/>
          </p>
        </xsl:when>
        <xsl:otherwise>
          <p>Ganztägig</p>
        </xsl:otherwise>
      </xsl:choose>
      
      
    </li>
  </xsl:template>
  
  <xsl:template name="newline-to-br">
    <xsl:param name="text"/>
    <xsl:choose>
      <xsl:when test="contains($text, '&#10;')">
        <xsl:value-of select="substring-before($text, '&#10;')"/>
        <br/>
        <xsl:call-template name="newline-to-br">
          <xsl:with-param name="text" select="substring-after($text, '&#10;')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
</xsl:stylesheet>
